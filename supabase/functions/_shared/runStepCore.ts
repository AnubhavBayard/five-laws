import { z } from 'zod';
import { type CheckResult, POST_CHECKS } from './checks.ts';
import { SYSTEM_PROMPT, userMessage } from './prompts.ts';
import { REGISTRY, type Tier } from './registry.ts';
import { type FailReason, isStepId, StepContext, type StepId, type StepResult, STEPS } from './steps.ts';

export const MAX_INPUT_CHARS = 4000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type CoreDeps = {
  fetch: typeof fetch;
  apiKey: string;
  models: Record<Tier, string>;
  /** Returns false when the caller is over today's cap. Runs only for well-formed requests. */
  checkCap: () => Promise<boolean>;
  /** One deadline for both attempts. The client gives up at 15 s, so this stays under it. */
  timeoutMs?: number;
};

/** What the server logs. Never contains user text. */
export type StepMeta = {
  stepId: string;
  promptVersion: string | null;
  model: string | null;
  latencyMs: number;
  valid: boolean;
  retry: boolean;
  reason: FailReason | null;
};

const Body = z.object({ stepId: z.string().max(60), input: z.unknown(), context: StepContext });

const Completion = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(z.object({ id: z.string(), function: z.object({ name: z.string(), arguments: z.string() }) }))
            .nullish(),
        }),
      }),
    )
    .min(1),
});

type Message =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: unknown[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** Total characters across every string in the input, so JSON keys and punctuation don't count. */
function textLength(v: unknown): number {
  if (typeof v === 'string') return v.length;
  if (Array.isArray(v)) return v.reduce<number>((n, x) => n + textLength(x), 0);
  if (v && typeof v === 'object') return Object.values(v).reduce<number>((n, x) => n + textLength(x), 0);
  return 0;
}

function toolParameters(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json;
}

/** Validates the request, runs one forced tool call, retries once with the errors, and never throws. */
export async function handleStep(body: unknown, deps: CoreDeps): Promise<{ result: StepResult; meta: StepMeta }> {
  const started = Date.now();
  const meta: StepMeta = { stepId: '', promptVersion: null, model: null, latencyMs: 0, valid: false, retry: false, reason: null };
  const fail = (reason: FailReason) => {
    meta.reason = reason;
    meta.latencyMs = Date.now() - started;
    return { result: { ok: false, reason } as const, meta };
  };

  const req = Body.safeParse(body);
  if (!req.success) return fail('bad_input');
  meta.stepId = req.data.stepId;
  if (!isStepId(req.data.stepId)) return fail('unknown_step');
  const stepId: StepId = req.data.stepId;
  if (textLength(req.data.input) > MAX_INPUT_CHARS) return fail('too_long');
  const input = STEPS[stepId].input.safeParse(req.data.input);
  if (!input.success) return fail('bad_input');
  if (!(await deps.checkCap())) return fail('over_cap');

  const def = REGISTRY[stepId];
  const output = STEPS[stepId].output as z.ZodType;
  const postCheck = POST_CHECKS[stepId] as ((i: unknown, o: unknown) => CheckResult<unknown>) | undefined;
  const model = deps.models[def.tier];
  Object.assign(meta, { promptVersion: def.promptVersion, model });

  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage(def.instruction, input.data, req.data.context) },
  ];
  const signal = AbortSignal.timeout(deps.timeoutMs ?? 14_000);

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      meta.retry = attempt > 0;
      const res = await deps.fetch(OPENROUTER_URL, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${deps.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          tools: [{ type: 'function', function: { name: def.toolName, parameters: toolParameters(output) } }],
          tool_choice: { type: 'function', function: { name: def.toolName } },
          parallel_tool_calls: false,
          temperature: 0,
          seed: 7,
          max_tokens: def.maxTokens,
          provider: { require_parameters: true },
        }),
      });
      if (!res.ok) return fail('upstream');

      const completion = Completion.safeParse(await res.json());
      const message = completion.success ? completion.data.choices[0]?.message : undefined;
      const call = message?.tool_calls?.find((c) => c.function.name === def.toolName);

      let errors: string[];
      if (!call) {
        errors = [`You must answer by calling the ${def.toolName} tool.`];
      } else {
        let args: unknown;
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          args = undefined;
        }
        const parsed = output.safeParse(args);
        if (parsed.success) {
          const checked = postCheck ? postCheck(input.data, parsed.data) : { ok: true as const, output: parsed.data };
          if (checked.ok) {
            meta.valid = true;
            meta.latencyMs = Date.now() - started;
            return { result: { ok: true, output: checked.output } as StepResult, meta };
          }
          errors = checked.errors;
        } else {
          errors = parsed.error.issues.map((i) => `${i.path.join('.') || 'arguments'}: ${i.message}`);
        }
      }

      // Second attempt: show the model its own call and what was wrong with it.
      if (call) {
        messages.push({ role: 'assistant', content: message?.content ?? null, tool_calls: [{ id: call.id, type: 'function', function: call.function }] });
        messages.push({ role: 'tool', tool_call_id: call.id, content: `Invalid. Fix these and call ${def.toolName} again:\n- ${errors.join('\n- ')}` });
      } else {
        messages.push({ role: 'user', content: errors.join('\n') });
      }
    }
    return fail('invalid');
  } catch (e) {
    return fail(signal.aborted || (e instanceof Error && e.name === 'TimeoutError') ? 'timeout' : 'upstream');
  }
}
