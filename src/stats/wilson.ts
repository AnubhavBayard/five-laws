import type { LearningEntry, QuestionLog } from '../db/entities';
import { addDays } from '../lib/dates';

export type LearningStats = { topics: number; changedMind: number; questions: number; streak: number };

/**
 * Streak = consecutive days with at least one logged question, ending today.
 * If nothing is logged today yet, a streak that ended yesterday still counts: the day isn't over.
 */
export function questionStreak(days: string[], today: string): number {
  const set = new Set(days);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function learningStats(entries: Pick<LearningEntry, 'changedMind'>[], log: Pick<QuestionLog, 'day'>[], today: string): LearningStats {
  return {
    topics: entries.length,
    changedMind: entries.filter((e) => e.changedMind).length,
    questions: log.length,
    streak: questionStreak(log.map((q) => q.day), today),
  };
}
