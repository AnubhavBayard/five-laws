import { verdict } from './falkland.verdict';

describe('Falkland verdict', () => {
  it.each([
    [true, true, true, 'decide_now'],
    [true, false, false, 'decide_now'],
    [false, true, true, 'park'],
    [false, true, false, 'park'],
    [false, false, true, 'pick_one'],
    [false, false, false, 'decide_now'],
  ] as const)('q1=%s q2=%s q3=%s -> %s', (q1, q2, q3, out) => {
    expect(verdict({ q1, q2, q3 })).toBe(out);
  });
});
