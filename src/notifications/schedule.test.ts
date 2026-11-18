import { Capacitor } from '@capacitor/core';
import { setDb } from '../db/client';
import type { Decision, Fear, UserProfile } from '../db/entities';
import { decisions, fears } from '../db/repos';
import { migratedTestDb } from '../db/testDb';
import { useProfile } from '../store/profile';
import { CHECKIN_ID, dayAt, notificationId, plan, rescheduleAll } from './schedule';

const ln = vi.hoisted(() => ({
  getPending: vi.fn(() => Promise.resolve({ notifications: [{ id: 1 }, { id: 4242 }] })),
  cancel: vi.fn(() => Promise.resolve()),
  schedule: vi.fn((_o: { notifications: { id: number }[] }) => Promise.resolve({ notifications: [] })),
}));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }));

const profile: UserProfile = { lifeStage: 'student', areas: ['studies'], checkinTime: '20:30', aiEnabled: false, aiConsentAt: null, unloadReminder: false, onboardedAt: '2026-11-01T10:00:00.000Z' };
const meta = (id: string) => ({ id, createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', lifeArea: 'studies' as const });
const fear = (id: string, eventDate: string | null, outcome: Fear['outcome'] = null): Fear => ({
  ...meta(id), fear: 'Private fear text', eventDate, firstSign: '', ifThenPlans: [], actionThisWeek: '', likelihood: 50, outcome, resolvedAt: null,
});
const decision = (id: string, patch: Partial<Decision>): Decision => ({
  ...meta(id), decision: 'Private decision', options: ['A', 'B'], unknowns: [], q1: false, q2: true, q3: true, verdict: 'park', revisitOn: null, findOut: [], postponeCount: 0, status: 'parked', choice: null, expectedOutcome: null, reviewOn: null, actualOutcome: null, ...patch,
});
const NOW = new Date(2026, 10, 19, 12, 0); // 19 Nov 2026, noon local

describe('notification plan', () => {
  it('builds stable, distinct ids that never clash with the check-in', () => {
    const a = notificationId('fear', 'abc');
    expect(notificationId('fear', 'abc')).toBe(a);
    expect(notificationId('revisit', 'abc')).not.toBe(a);
    for (let i = 0; i < 500; i++) {
      const id = notificationId('fear', crypto.randomUUID());
      expect(id).toBeGreaterThan(CHECKIN_ID);
      expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
    }
  });

  it('turns a day and time into local time', () => {
    expect(dayAt('2026-11-25', '20:30')).toEqual(new Date(2026, 10, 25, 20, 30));
  });

  it('schedules the daily check-in and future follow-ups at check-in time, with no journal text', () => {
    const p = plan(
      profile,
      [fear('f-future', '2026-11-25'), fear('f-today', '2026-11-19'), fear('f-past', '2026-11-18'), fear('f-done', '2026-11-30', 'didnt'), fear('f-nodate', null)],
      [
        decision('d-park', { revisitOn: '2026-11-26' }),
        decision('d-review', { status: 'decided', verdict: 'pick_one', choice: 'A', reviewOn: '2026-12-01' }),
        decision('d-reviewed', { status: 'reviewed', reviewOn: '2026-12-01', actualOutcome: 'fine' }),
      ],
      NOW,
    );
    expect(p.map((n) => [n.extra.kind, n.extra.entryId, n.at])).toEqual([
      ['checkin', null, null],
      ['fear', 'f-future', new Date(2026, 10, 25, 20, 30)],
      ['fear', 'f-today', new Date(2026, 10, 19, 20, 30)], // later today still counts
      ['revisit', 'd-park', new Date(2026, 10, 26, 20, 30)],
      ['review', 'd-review', new Date(2026, 11, 1, 20, 30)],
    ]);
    expect(p[0]).toMatchObject({ id: CHECKIN_ID, daily: { hour: 20, minute: 30 } });
    expect(p.find((n) => n.extra.kind === 'fear')?.actionTypeId).toBe('fear-outcome');
    expect(JSON.stringify(p)).not.toMatch(/Private/);
  });

  it('plans nothing before onboarding', () => {
    expect(plan(null, [fear('f', '2026-12-01')], [], NOW)).toEqual([]);
  });
});

describe('rescheduleAll', () => {
  it('cancels what is pending and schedules the plan on native', async () => {
    setDb(await migratedTestDb());
    useProfile.setState({ profile });
    const saved = await fears.create({ ...fear('x', '2026-11-25') }, NOW);
    await decisions.create({ ...decision('y', { revisitOn: '2026-11-18' }) }, NOW); // already due: Today handles it
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    await rescheduleAll(NOW);
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 4242 }] });
    const ids = ln.schedule.mock.calls[0]?.[0].notifications.map((n) => n.id);
    expect(ids).toEqual([CHECKIN_ID, notificationId('fear', saved.id)]);
  });
});
