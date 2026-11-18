import { setDb } from '../db/client';
import type { Decision, Fear } from '../db/entities';
import { decisions, fears } from '../db/repos';
import { migratedTestDb } from '../db/testDb';
import { decideParked, dueFollowUps, parkAgain, recordOutcome, reviewDecision } from './followups';

const base = { lifeArea: 'career' as const };
const newFear = (eventDate: string | null, outcome: Fear['outcome'] = null) => ({ ...base, fear: 'f', eventDate, firstSign: '', ifThenPlans: [], actionThisWeek: '', likelihood: 40, outcome, resolvedAt: null });
const newDecision = (p: Partial<Decision>) => ({
  ...base, decision: 'd', options: ['A', 'B'], unknowns: [], q1: false, q2: true, q3: true, verdict: 'park' as const, revisitOn: null, findOut: [], postponeCount: 0, status: 'parked' as const, choice: null, expectedOutcome: null, reviewOn: null, actualOutcome: null, ...p,
});

beforeEach(async () => setDb(await migratedTestDb()));

describe('follow-ups', () => {
  it('lists only what is due, oldest first', async () => {
    const f1 = await fears.create(newFear('2026-11-17'));
    await fears.create(newFear('2026-11-20'));
    await fears.create(newFear('2026-11-10', 'didnt'));
    const d1 = await decisions.create(newDecision({ revisitOn: '2026-11-19' }));
    const d2 = await decisions.create(newDecision({ status: 'decided', verdict: 'pick_one', choice: 'A', reviewOn: '2026-11-15' }));
    const due = dueFollowUps(await fears.list(), await decisions.list(), '2026-11-19');
    expect(due.map((x) => [x.kind, x.due])).toEqual([['review', '2026-11-15'], ['fear', '2026-11-17'], ['revisit', '2026-11-19']]);
    expect(due.map((x) => (x.kind === 'fear' ? x.fear.id : x.decision.id))).toEqual([d2.id, f1.id, d1.id]);
  });

  it('records outcomes, parks again, decides and reviews', async () => {
    const now = new Date('2026-11-19T15:00:00.000Z');
    const f = await fears.create(newFear('2026-11-17'));
    expect(await recordOutcome(f.id, 'partly', now)).toMatchObject({ outcome: 'partly', resolvedAt: now.toISOString() });

    const d = await decisions.create(newDecision({ revisitOn: '2026-11-19' }));
    expect(await parkAgain(d.id, '2026-11-19', now)).toMatchObject({ revisitOn: '2026-11-26', postponeCount: 1, status: 'parked' });
    expect(await decideParked(d.id, 'B', '  ', now)).toMatchObject({ status: 'decided', choice: 'B', expectedOutcome: null, revisitOn: null });
    expect(await reviewDecision(d.id, ' Went fine ', now)).toMatchObject({ status: 'reviewed', actualOutcome: 'Went fine' });
  });
});
