import type { Decision } from '../db/entities';

export type Answers = { q1: boolean; q2: boolean; q3: boolean };

export const QUESTIONS = {
  q1: 'Does something break or get worse if you don’t decide this week?',
  q2: 'Will you know more if you wait a little?',
  q3: 'Could you change course later if you pick wrong?',
} as const;

/**
 * Falkland's law as code:
 * a real cost to waiting means decide now; free facts on the way mean park it;
 * otherwise waiting buys nothing, so pick one, carefully if it can't be undone.
 */
export function verdict({ q1, q2, q3 }: Answers): NonNullable<Decision['verdict']> {
  if (q1) return 'decide_now';
  if (q2) return 'park';
  return q3 ? 'pick_one' : 'decide_now';
}
