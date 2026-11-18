import { filterJournal, toJournal } from '../db/journal';
import { entryFields } from '../lib/fields';
import { decisionStats, insightInput, totalEntries } from './insights';
import { fearStats } from './murphy';

const meta = (id: string, createdAt: string) => ({ id, createdAt, updatedAt: createdAt, lifeArea: 'money' as const });

describe('journal', () => {
  const fear = { ...meta('f1', '2026-11-10T10:00:00.000Z'), fear: 'Rent goes up', eventDate: '2026-12-01', firstSign: 'Letter', ifThenPlans: ['If it does, then I negotiate.'], actionThisWeek: '', likelihood: 70, outcome: null, resolvedAt: null };
  const problem = { ...meta('p1', '2026-11-12T10:00:00.000Z'), lifeArea: 'career' as const, rant: 'boss', clarifyQA: [], whatIsHappening: 'My manager changes priorities daily', solvedLooksLike: '', inMyControl: '', nextStep: 'Ask for a weekly list', tags: ['work'], status: 'open' as const, resolvedAt: null };
  const linked = { ...meta('c1', '2026-11-12T09:00:00.000Z'), text: 'boss', cleanedText: null, suggestedPrimary: null, suggestedSecondary: null, confidence: null, chosenLaw: 'kidlin' as const, entryTable: 'problems', entryId: 'p1' };
  const note = { ...linked, id: 'c2', createdAt: '2026-11-13T09:00:00.000Z', text: 'Slept badly again', entryId: null, entryTable: null };
  const items = toJournal({ fears: [fear], problems: [problem], learning: [], decisions: [], briefs: [], checkins: [linked, note] });

  it('merges tools newest first and hides check-ins that became entries', () => {
    expect(items.map((i) => [i.table, i.title, i.status])).toEqual([
      ['checkins', 'Slept badly again', 'Note'],
      ['problems', 'My manager changes priorities daily', 'Open'],
      ['fears', 'Rent goes up', 'Due Tuesday 1 December'],
    ]);
  });

  it('filters by law, area and every search word, across all fields', () => {
    expect(filterJournal(items, { law: 'kidlin', area: null, q: '' }).map((i) => i.id)).toEqual(['p1']);
    expect(filterJournal(items, { law: 'notes', area: null, q: '' }).map((i) => i.id)).toEqual(['c2']);
    expect(filterJournal(items, { law: null, area: 'money', q: '' }).map((i) => i.id)).toEqual(['c2', 'f1']);
    expect(filterJournal(items, { law: null, area: null, q: 'NEGOTIATE rent' }).map((i) => i.id)).toEqual(['f1']);
    expect(filterJournal(items, { law: null, area: null, q: 'weekly list' }).map((i) => i.id)).toEqual(['p1']);
  });

  it('turns an entry into readable fields, skipping empty ones', () => {
    expect(entryFields('fears', fear)).toEqual([
      { label: 'The fear', value: 'Rent goes up' },
      { label: 'When', value: 'Tuesday 1 December' },
      { label: 'First sign', value: 'Letter' },
      { label: 'If this, then that', value: ['If it does, then I negotiate.'] },
      { label: 'How likely it felt', value: '70%' },
    ]);
    expect(entryFields('problems', problem).at(-1)).toEqual({ label: 'Status', value: 'Open' });
  });
});

describe('insight input', () => {
  it('flattens stats, drops nulls and counts entries', () => {
    const s = {
      fears: fearStats([{ likelihood: 50, outcome: null }]),
      problems: { logged: 2, open: 1, resolved: 1, topTags: [] },
      learning: { topics: 1, changedMind: 0, questions: 4, streak: 2 },
      decisions: decisionStats([{ status: 'parked', postponeCount: 2 }, { status: 'decided', postponeCount: 0 }]),
      briefs: 0,
    };
    const input = insightInput(s);
    expect(input).toMatchObject({ fears_logged: 1, fears_resolved: 0, decisions_parked: 1, decisions_parked_again: 2, learning_question_streak_days: 2 });
    expect('fears_did_not_happen_pct' in input).toBe(false);
    expect(Object.keys(input).every((k) => k.length <= 60)).toBe(true);
    expect(totalEntries(s)).toBe(6);
  });
});
