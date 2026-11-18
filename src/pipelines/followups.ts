import type { Decision, Fear } from '../db/entities';
import { decisions, fears } from '../db/repos';
import { addDays } from '../lib/dates';
import { PARK_DAYS } from './falkland';

export type FollowUp =
  | { kind: 'fear'; due: string; fear: Fear }
  | { kind: 'revisit'; due: string; decision: Decision }
  | { kind: 'review'; due: string; decision: Decision };

/** Everything due on or before today, oldest first. */
export function dueFollowUps(fs: Fear[], ds: Decision[], today: string): FollowUp[] {
  const out: FollowUp[] = [];
  for (const fear of fs) if (fear.outcome === null && fear.eventDate && fear.eventDate <= today) out.push({ kind: 'fear', due: fear.eventDate, fear });
  for (const decision of ds) {
    if (decision.status === 'parked' && decision.revisitOn && decision.revisitOn <= today) out.push({ kind: 'revisit', due: decision.revisitOn, decision });
    if (decision.status === 'decided' && decision.reviewOn && decision.reviewOn <= today && decision.actualOutcome === null) {
      out.push({ kind: 'review', due: decision.reviewOn, decision });
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

export function recordOutcome(id: string, outcome: NonNullable<Fear['outcome']>, now = new Date()) {
  return fears.update(id, { outcome, resolvedAt: now.toISOString() }, now);
}

/** Pushes the revisit date a week past today and counts the postponement. */
export async function parkAgain(id: string, today: string, now = new Date()) {
  const d = await decisions.get(id);
  if (!d) throw new Error(`decision ${id} not found`);
  return decisions.update(id, { revisitOn: addDays(today, PARK_DAYS), postponeCount: d.postponeCount + 1 }, now);
}

export function decideParked(id: string, choice: string, expectedOutcome: string, now = new Date()) {
  return decisions.update(id, { status: 'decided', choice, expectedOutcome: expectedOutcome.trim() || null, revisitOn: null, reviewOn: null }, now);
}

export function reviewDecision(id: string, actualOutcome: string, now = new Date()) {
  return decisions.update(id, { status: 'reviewed', actualOutcome: actualOutcome.trim() }, now);
}
