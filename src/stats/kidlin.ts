import type { Problem } from '../db/entities';

export type ProblemStats = { logged: number; open: number; resolved: number; topTags: { tag: string; count: number }[] };

/** Counts, plus the three most used tags (ties broken alphabetically). */
export function problemStats(problems: Pick<Problem, 'status' | 'tags'>[]): ProblemStats {
  const counts = new Map<string, number>();
  for (const p of problems) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTags = [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 3);
  const resolved = problems.filter((p) => p.status === 'resolved').length;
  return { logged: problems.length, open: problems.length - resolved, resolved, topTags };
}
