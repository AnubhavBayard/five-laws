import { fearStats } from './murphy';

describe('fearStats', () => {
  it('is empty-safe', () => {
    expect(fearStats([])).toEqual({ logged: 0, resolved: 0, happened: 0, partly: 0, didnt: 0, didntPct: null, predictedPct: null, actualPct: null });
  });

  it('counts outcomes and compares forecast with reality', () => {
    const s = fearStats([
      { likelihood: 80, outcome: 'didnt' },
      { likelihood: 60, outcome: 'didnt' },
      { likelihood: 70, outcome: 'partly' },
      { likelihood: 90, outcome: 'happened' },
      { likelihood: 50, outcome: null },
    ]);
    expect(s).toEqual({ logged: 5, resolved: 4, happened: 1, partly: 1, didnt: 2, didntPct: 50, predictedPct: 75, actualPct: 38 });
  });
});
