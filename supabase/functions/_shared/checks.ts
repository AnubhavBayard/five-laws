import type { StepId, StepInput, StepOutput } from './steps.ts';

export type CheckResult<T> = { ok: true; output: T } | { ok: false; errors: string[] };
type PostCheck<S extends StepId> = (input: StepInput<S>, output: StepOutput<S>) => CheckResult<StepOutput<S>>;

const norm = (s: string) => s.toLowerCase().replace(/[\s‘’'"`]+/g, ' ').trim();

/** True only for a real calendar day: rejects 2026-02-30 and similar. */
export function isRealDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

const STOP = new Set(
  'about after again also because been before being could does doing from have here into just like more most much need should some such than that their them then there these they this those what when where which while will with would your yours'.split(' '),
);

/** Content words of 4+ letters, minus common filler. */
export function keyTerms(text: string): string[] {
  return [...new Set(norm(text).match(/[a-z0-9][a-z0-9-]{3,}/g) ?? [])].filter((w) => !STOP.has(w));
}

/** Numbers written as digits, e.g. "3", "62.5", "1,200". */
export function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
}

/** A number in the text is allowed if it matches a stat exactly or as a rounded display (whole or 1 decimal). */
export function unknownNumbers(text: string, stats: Record<string, number>): number[] {
  const allowed = new Set<number>();
  for (const v of Object.values(stats)) {
    allowed.add(v);
    allowed.add(Math.round(v));
    allowed.add(Math.round(v * 10) / 10);
  }
  return numbersIn(text).filter((n) => !allowed.has(n));
}

export const POST_CHECKS: { [S in StepId]?: PostCheck<S> } = {
  route_checkin: (_in, out) => ({
    ok: true,
    output: { ...out, secondaryLaw: out.secondaryLaw === out.primaryLaw ? null : out.secondaryLaw },
  }),

  structure_fear: (_in, out) =>
    out.eventDate === null || isRealDate(out.eventDate)
      ? { ok: true, output: out }
      : { ok: false, errors: [`eventDate ${out.eventDate} is not a real calendar date; use YYYY-MM-DD or null`] },

  // Quotes the model claims are vague must be the user's own words; anything else is dropped.
  review_explanation: (input, out) => {
    const source = norm(input.explanation);
    return { ok: true, output: { ...out, vagueParts: out.vagueParts.filter((p) => source.includes(norm(p))) } };
  },

  // ponytail: "half the key terms" is a heuristic; swap for per-term synonyms if real drafts fail it too often.
  draft_clarifying_message: (input, out) => {
    const msg = norm(out.message);
    const missing = input.openQuestions.filter((q) => {
      const terms = keyTerms(q);
      const hits = terms.filter((t) => msg.includes(t)).length;
      return hits < Math.ceil(terms.length / 2);
    });
    return missing.length === 0
      ? { ok: true, output: out }
      : { ok: false, errors: missing.map((q) => `message does not ask this open question: ${q}`) };
  },

  write_insight: (input, out) => {
    const bad = unknownNumbers(out.observation, input.stats);
    return bad.length === 0
      ? { ok: true, output: out }
      : { ok: false, errors: [`these numbers are not in the stats: ${bad.join(', ')}. Use only the numbers given.`] };
  },
};
