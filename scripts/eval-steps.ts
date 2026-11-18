// Live evaluation of every AI step against real models. Costs money and sends the fixture text (never user data)
// to OpenRouter. Usage:
//   OPENROUTER_API_KEY=... MODEL_FAST=... MODEL_WRITER=... node scripts/eval-steps.ts [stepId ...]
import { handleStep } from '../supabase/functions/_shared/runStepCore.ts';
import { STEP_IDS, type StepId } from '../supabase/functions/_shared/steps.ts';
import { type Fixture, FIXTURES } from './fixtures.ts';

const { OPENROUTER_API_KEY: apiKey, MODEL_FAST, MODEL_WRITER } = process.env;
if (!apiKey || !MODEL_FAST || !MODEL_WRITER) {
  console.error('Set OPENROUTER_API_KEY, MODEL_FAST and MODEL_WRITER (same values as the Edge Function secrets).');
  process.exit(2);
}

const wanted = process.argv.slice(2);
const unknown = wanted.filter((s) => !(STEP_IDS as string[]).includes(s));
if (unknown.length) {
  console.error(`Unknown step(s): ${unknown.join(', ')}. Known: ${STEP_IDS.join(', ')}`);
  process.exit(2);
}
const steps = (wanted.length ? wanted : STEP_IDS) as StepId[];

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '–');
const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] ?? 0;

let passed = 0;
let total = 0;
const rows: Record<string, string>[] = [];
for (const stepId of steps) {
  const fixtures = FIXTURES[stepId] as Fixture<StepId>[];
  const latencies: number[] = [];
  let ok = 0;
  let retried = 0;
  let routed = 0;
  const failures = new Map<string, number>();
  for (const f of fixtures) {
    // One request at a time: easier on rate limits, and latency stays comparable.
    const { result, meta } = await handleStep(
      { stepId, input: f.input, context: { lifeStage: f.stage } },
      { fetch, apiKey, models: { FAST: MODEL_FAST, WRITER: MODEL_WRITER }, checkCap: async () => true, timeoutMs: 30_000 },
    );
    latencies.push(meta.latencyMs);
    if (meta.retry) retried++;
    if (result.ok) {
      ok++;
      if (f.law && 'primaryLaw' in result.output && result.output.primaryLaw === f.law) routed++;
    } else {
      failures.set(result.reason, (failures.get(result.reason) ?? 0) + 1);
    }
  }
  passed += ok;
  total += fixtures.length;
  rows.push({
    step: stepId,
    pass: `${ok}/${fixtures.length}`,
    retried: String(retried),
    'p50 ms': String(quantile(latencies, 0.5)),
    'p95 ms': String(quantile(latencies, 0.95)),
    'law match': stepId === 'route_checkin' ? pct(routed, fixtures.length) : '',
    failures: [...failures].map(([r, n]) => `${r}×${n}`).join(' '),
  });
  console.error(`done ${stepId}`);
}

console.table(rows);
console.log(`overall ${passed}/${total} (${pct(passed, total)})`);
process.exit(passed / total >= 0.9 ? 0 : 1);
