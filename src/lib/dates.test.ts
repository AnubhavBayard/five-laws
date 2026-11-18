import { addDays, formatDay, toDay } from './dates';

describe('dates', () => {
  it('formats local calendar days', () => {
    expect(toDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('writes a day out in words', () => {
    expect(formatDay('2026-11-25')).toBe('Wednesday 25 November');
  });
});
