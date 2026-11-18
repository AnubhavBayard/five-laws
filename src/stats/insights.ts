import type { Decision } from '../db/entities';
import type { ProblemStats } from './kidlin';
import type { FearStats } from './murphy';
import type { LearningStats } from './wilson';

export type DecisionStats = { logged: number; parked: number; decided: number; reviewed: number; parkedAgain: number };

export function decisionStats(ds: Pick<Decision, 'status' | 'postponeCount'>[]): DecisionStats {
  const n = (s: Decision['status']) => ds.filter((d) => d.status === s).length;
  return { logged: ds.length, parked: n('parked'), decided: n('decided'), reviewed: n('reviewed'), parkedAgain: ds.reduce((s, d) => s + d.postponeCount, 0) };
}

export type AllStats = { fears: FearStats; problems: ProblemStats; learning: LearningStats; decisions: DecisionStats; briefs: number };

/** Below this many entries, an AI observation would be reading tea leaves. */
export const MIN_ENTRIES_FOR_INSIGHT = 3;

export const totalEntries = (s: AllStats) => s.fears.logged + s.problems.logged + s.learning.topics + s.decisions.logged + s.briefs;

/** The only numbers the insight step may use: flat, named, nulls dropped. */
export function insightInput(s: AllStats): Record<string, number> {
  const raw: Record<string, number | null> = {
    fears_logged: s.fears.logged,
    fears_resolved: s.fears.resolved,
    fears_did_not_happen: s.fears.didnt,
    fears_did_not_happen_pct: s.fears.didntPct,
    fears_predicted_likelihood_pct: s.fears.predictedPct,
    fears_came_true_pct: s.fears.actualPct,
    problems_open: s.problems.open,
    problems_resolved: s.problems.resolved,
    learning_topics: s.learning.topics,
    learning_questions_asked: s.learning.questions,
    learning_question_streak_days: s.learning.streak,
    learning_changed_mind: s.learning.changedMind,
    decisions_parked: s.decisions.parked,
    decisions_decided: s.decisions.decided,
    decisions_reviewed: s.decisions.reviewed,
    decisions_parked_again: s.decisions.parkedAgain,
    briefs_written: s.briefs,
  };
  return Object.fromEntries(Object.entries(raw).filter((e): e is [string, number] => e[1] !== null));
}
