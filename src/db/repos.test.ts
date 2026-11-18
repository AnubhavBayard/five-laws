import { setDb } from './client';
import { MIGRATIONS, migrate } from './migrations';
import { briefs, checkins, decisions, fears, learning, logAiStep, problems, questionLog } from './repos';
import { migratedTestDb, nodeDb } from './testDb';
import type { Db } from './types';

let db: Db;
beforeEach(async () => {
  db = await migratedTestDb();
  setDb(db);
});

describe('migrations', () => {
  it('runs once and records the version', async () => {
    const fresh = nodeDb();
    expect(await migrate(fresh)).toBe(MIGRATIONS.length);
    await migrate(fresh); // second run is a no-op, not a "table exists" error
    const rows = await fresh.all('SELECT version FROM schema_migrations');
    expect(rows).toHaveLength(MIGRATIONS.length);
  });

  it('versions are strictly increasing', () => {
    MIGRATIONS.forEach((m, i) => expect(m.version).toBe(i + 1));
  });
});

const fearInput: Parameters<typeof fears.create>[0] = { lifeArea: 'studies', fear: 'I will fail the stats exam', eventDate: '2026-11-25', firstSign: 'I can’t do last year’s paper', ifThenPlans: ['If I score under 50% on the mock, then I book office hours.'], actionThisWeek: 'Do one past paper on Saturday', likelihood: 70, outcome: null, resolvedAt: null };

// One realistic entity per table: catches any schema/column mismatch through a full round trip.
const samples = {
  checkins: [checkins, { lifeArea: 'studies', text: 'exam next week and I keep putting off revision', cleanedText: 'I keep putting off revision for next week’s exam.', suggestedPrimary: 'murphy', suggestedSecondary: 'kidlin', confidence: 0.72, chosenLaw: 'murphy', entryTable: null, entryId: null }],
  fears: [fears, fearInput],
  problems: [problems, { lifeArea: 'career', rant: 'my manager keeps changing priorities', clarifyQA: [{ q: 'What changed this week?', a: 'Two new tasks' }], whatIsHappening: 'Priorities change mid-sprint', solvedLooksLike: 'One agreed list per week', inMyControl: 'Asking for the list on Monday', nextStep: 'Send a 3-line message', tags: ['priorities', 'manager'], status: 'open', resolvedAt: null }],
  learning: [learning, { lifeArea: 'studies', topic: 'Bayes theorem', assumptions: ['It is just for statisticians'], scaryQuestion: 'What is a prior?', beginnerQuestions: ['Why multiply?', 'What is evidence?', 'Why divide?'], explanation: 'You update a guess with new evidence.', review: { jargonTerms: ['prior'], vagueParts: ['update a guess'], gapQuestion: 'How much do you update?' }, learned: '', changedMind: true }],
  decisions: [decisions, { lifeArea: 'career', decision: 'Take the job offer or stay', options: ['Take it', 'Stay'], unknowns: ['Team culture'], q1: false, q2: true, q3: true, verdict: 'park', revisitOn: '2026-12-02', findOut: ['Talk to someone on the team'], postponeCount: 0, status: 'parked', choice: null, expectedOutcome: null, reviewOn: null, actualOutcome: null }],
  briefs: [briefs, { lifeArea: 'career', mode: 'brief', taskAsGiven: 'Make the report better', doneLooksLike: 'Two-page summary', deadline: 'Friday', approver: null, openQuestions: ['Who reads it?'], recipient: 'manager', message: null, subgoals: [], nextAction: null, sourceProblemId: null }],
  questionLog: [questionLog, { lifeArea: 'studies', day: '2026-11-18', learningId: null, text: 'What is a prior?' }],
};

describe.each(Object.entries(samples))('%s repository', (_name, [repo, input]) => {
  it('creates, reads, updates, lists and removes', async () => {
    const r = repo as typeof fears; // all repos share the same generic shape
    const created = await r.create(input as never, new Date('2026-11-18T10:00:00Z'));
    expect(await r.get(created.id)).toEqual(created);

    const updated = await r.update(created.id, { lifeArea: 'health' }, new Date('2026-11-19T10:00:00Z'));
    expect(updated.updatedAt).toBe('2026-11-19T10:00:00.000Z');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(await r.get(created.id)).toEqual(updated);

    expect(await r.list({ lifeArea: 'health' })).toHaveLength(1);
    expect(await r.list({ lifeArea: 'money' })).toHaveLength(0);

    await r.remove(created.id);
    expect(await r.get(created.id)).toBeNull();
  });
});

describe('validation', () => {
  it('refuses to write invalid entities', async () => {
    const input = fearInput;
    await expect(fears.create({ ...input, likelihood: 140 })).rejects.toThrow();
    await expect(fears.create({ ...input, eventDate: '25/11/2026' })).rejects.toThrow();
    expect(await fears.list()).toHaveLength(0);
  });

  it('lists newest first', async () => {
    const input = fearInput;
    await fears.create(input, new Date('2026-11-01T00:00:00Z'));
    const newer = await fears.create(input, new Date('2026-11-10T00:00:00Z'));
    expect((await fears.list())[0]?.id).toBe(newer.id);
  });

  it('rolls back a failed transaction', async () => {
    const input = fearInput;
    await expect(
      db.tx(async () => {
        await fears.create(input);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await fears.list()).toHaveLength(0);
  });

  it('logs AI steps without user text', async () => {
    await logAiStep({ stepId: 'route_checkin', promptVersion: 'v1', model: 'm', latencyMs: 820, ok: true, validationPassed: true, retryUsed: false, reason: null });
    const rows = await db.all('SELECT * FROM ai_step_log');
    expect(rows[0]).toMatchObject({ stepId: 'route_checkin', ok: 1, retryUsed: 0 });
  });
});
