import type { Fear } from '../db/entities';

export type FearStats = {
  logged: number;
  resolved: number;
  happened: number;
  partly: number;
  didnt: number;
  /** Share of resolved fears that did not happen, 0–100 whole number. null until one is resolved. */
  didntPct: number | null;
  /** Mean likelihood the user gave their resolved fears, 0–100 whole number. */
  predictedPct: number | null;
  /** How often resolved fears came true, counting "partly" as half, 0–100 whole number. */
  actualPct: number | null;
};

export function fearStats(fears: Pick<Fear, 'likelihood' | 'outcome'>[]): FearStats {
  const done = fears.filter((f) => f.outcome !== null);
  const count = (o: Fear['outcome']) => done.filter((f) => f.outcome === o).length;
  const happened = count('happened');
  const partly = count('partly');
  const didnt = count('didnt');
  const pct = (n: number) => (done.length ? Math.round((n / done.length) * 100) : null);
  return {
    logged: fears.length,
    resolved: done.length,
    happened,
    partly,
    didnt,
    didntPct: pct(didnt),
    predictedPct: pct(done.reduce((s, f) => s + f.likelihood / 100, 0)),
    actualPct: pct(happened + partly / 2),
  };
}
