import { Preferences } from '@capacitor/preferences';
import { type FailReason, STEPS, type StepId, type StepInput, type StepOutput, type StepResult } from '@shared/steps';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logAiStep } from '../db/repos';
import { useProfile } from '../store/profile';

const CLIENT_TIMEOUT_MS = 15_000;

const ServerMeta = z.object({
  promptVersion: z.string().nullish(),
  model: z.string().nullish(),
  valid: z.boolean().optional(),
  retry: z.boolean().optional(),
});
type ServerMeta = z.infer<typeof ServerMeta>;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: {
      storage: {
        getItem: async (k) => (await Preferences.get({ key: k })).value,
        setItem: (k, v) => Preferences.set({ key: k, value: v }),
        removeItem: (k) => Preferences.remove({ key: k }),
      },
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** True when a step would actually reach the model. Screens use it to skip straight to the manual form. */
export function aiAvailable(): boolean {
  const p = useProfile.getState().profile;
  return !!p?.aiEnabled && !!p.aiConsentAt && navigator.onLine && supabase() !== null;
}

/**
 * Runs one AI step. Never throws: every failure is `{ ok: false }`, and the caller shows the manual form.
 * The output is parsed again here because nothing from the network is trusted.
 */
export async function runStep<S extends StepId>(stepId: S, input: StepInput<S>): Promise<StepResult<S>> {
  const profile = useProfile.getState().profile;
  if (!profile?.aiEnabled) return { ok: false, reason: 'off' };
  if (!profile.aiConsentAt) return { ok: false, reason: 'consent' };
  if (!navigator.onLine) return { ok: false, reason: 'offline' };
  const sb = supabase();
  if (!sb) return { ok: false, reason: 'off' };

  const started = Date.now();
  let result: StepResult<S>;
  let meta: ServerMeta = {};
  try {
    const { data: session } = await sb.auth.getSession();
    if (!session.session) {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw error;
    }
    const { data, error } = await sb.functions.invoke('ai-step', {
      body: { stepId, input, context: { lifeStage: profile.lifeStage } },
      timeout: CLIENT_TIMEOUT_MS,
    });
    // A timeout or network drop also lands here as `error`.
    result = error ? { ok: false, reason: 'upstream' } : parseResult(stepId, data);
    meta = ServerMeta.catch({}).parse((data as { meta?: unknown } | null)?.meta);
  } catch {
    result = { ok: false, reason: 'upstream' };
  }

  if (import.meta.env.DEV) {
    void logAiStep({
      stepId,
      promptVersion: meta.promptVersion ?? '',
      model: meta.model ?? '',
      latencyMs: Date.now() - started,
      ok: result.ok,
      validationPassed: meta.valid ?? false,
      retryUsed: meta.retry ?? false,
      reason: result.ok ? null : result.reason,
    }).catch(() => undefined);
  }
  return result;
}

function parseResult<S extends StepId>(stepId: S, data: unknown): StepResult<S> {
  const d = data as { ok?: unknown; output?: unknown; reason?: unknown } | null;
  if (d?.ok === true) {
    const out = STEPS[stepId].output.safeParse(d.output);
    return out.success ? ({ ok: true, output: out.data } as StepResult<S>) : { ok: false, reason: 'invalid' };
  }
  const reasons = ['over_cap', 'timeout', 'invalid', 'too_long', 'bad_input', 'unknown_step', 'unauthorized'] as const;
  const reason = reasons.find((r) => r === d?.reason) ?? 'upstream';
  return { ok: false, reason };
}

/** A step's result as a pipeline event, tagged with the step so reducers can tell answers apart. */
export type AiEvent<S extends StepId> =
  | { [K in S]: { type: 'ai_ok'; stepId: K; output: StepOutput<K> } }[S]
  | { type: 'ai_fail'; reason: FailReason | null };

export async function runStepEvent<S extends StepId>(stepId: S, input: StepInput<S>): Promise<AiEvent<S>> {
  const r = await runStep(stepId, input);
  return r.ok ? ({ type: 'ai_ok', stepId, output: r.output } as AiEvent<S>) : { type: 'ai_fail', reason: r.reason };
}
