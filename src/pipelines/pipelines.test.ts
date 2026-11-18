import { Decision, Fear } from '../db/entities';
import { falkland, finishDecision, initFalkland, type FalklandEvent, type FalklandState } from './falkland';
import { finishFear, initMurphy, murphy } from './murphy';

const meta = { id: crypto.randomUUID(), createdAt: '2026-11-19T10:00:00.000Z', updatedAt: '2026-11-19T10:00:00.000Z' };
const run = (s: FalklandState, ...events: FalklandEvent[]) => events.reduce(falkland, s);

describe('Murphy pipeline', () => {
  const fearOut = { fear: 'Failing the stats exam', eventDate: '2026-11-25', firstSign: 'Mock score under 50%', ifThenPlans: ['If the mock goes badly, then I book office hours.'], actionThisWeek: 'Do one past paper' };

  it('runs AI, fills the form, and saves a valid fear', () => {
    let s = murphy(initMurphy('studies'), { type: 'submit', text: '  scared of stats exam  ', ai: true });
    expect(s.step).toBe('structuring');
    s = murphy(s, { type: 'ai_ok', output: fearOut });
    expect(s).toMatchObject({ step: 'review', draft: { ...fearOut, likelihood: 50, lifeArea: 'studies' } });
    expect(() => Fear.parse({ ...finishFear(s.draft), ...meta })).not.toThrow();
  });

  it('goes straight to the manual form without AI and keeps the text as the fear', () => {
    const s = murphy(initMurphy('money'), { type: 'submit', text: 'rent goes up', ai: false });
    expect(s).toMatchObject({ step: 'review', notice: null, draft: { fear: 'rent goes up', firstSign: '' } });
  });

  it('falls back with a notice and ignores a late AI answer', () => {
    let s = murphy(initMurphy('money'), { type: 'submit', text: 'rent goes up', ai: true });
    s = murphy(s, { type: 'ai_fail', reason: 'timeout' });
    s = murphy(s, { type: 'edit', patch: { firstSign: 'Landlord emails' } });
    s = murphy(s, { type: 'ai_ok', output: fearOut });
    expect(s).toMatchObject({ step: 'review', notice: 'timeout', draft: { fear: 'rent goes up', firstSign: 'Landlord emails' } });
  });

  it('drops empty plans and blank dates', () => {
    const d = finishFear({ ...initMurphy('other').draft, fear: ' x ', ifThenPlans: ['  ', 'If a, then b.'], eventDate: '' });
    expect(d).toMatchObject({ fear: 'x', ifThenPlans: ['If a, then b.'], eventDate: null });
  });
});

describe('Falkland pipeline', () => {
  const extracted = { decision: 'Should I take the Pune offer?', options: ['Take it', 'Stay'], unknowns: ['Relocation budget'] };
  const toQuestions = (ai: boolean) =>
    run(initFalkland('career'), { type: 'submit', text: 'pune offer??', ai }, { type: 'ai_ok', output: extracted }, { type: 'next', ai, today: '2026-11-19' });

  it('parks a decision, asks AI what to find out, and sets a revisit date', () => {
    let s = toQuestions(true);
    expect(s.step).toBe('questions');
    s = run(s, { type: 'edit', patch: { q1: false, q2: true, q3: true } }, { type: 'next', ai: true, today: '2026-11-19' });
    expect(s).toMatchObject({ step: 'finding', draft: { verdict: 'park', revisitOn: '2026-11-26' } });
    s = falkland(s, { type: 'ai_ok', output: { items: ['Ask HR about relocation'] } });
    expect(s).toMatchObject({ step: 'park', draft: { findOut: ['Ask HR about relocation'] } });
    const saved = finishDecision(s.draft);
    expect(saved).toMatchObject({ status: 'parked', choice: null });
    expect(() => Decision.parse({ ...saved, ...meta })).not.toThrow();
  });

  it('sends "pick one" straight to choosing and saves it as decided', () => {
    let s = toQuestions(true);
    s = run(s, { type: 'edit', patch: { q1: false, q2: false, q3: true } }, { type: 'next', ai: true, today: '2026-11-19' });
    expect(s).toMatchObject({ step: 'decide', draft: { verdict: 'pick_one', revisitOn: null } });
    s = falkland(s, { type: 'edit', patch: { choice: 'Stay', expectedOutcome: '  ' } });
    const saved = finishDecision(s.draft);
    expect(saved).toMatchObject({ status: 'decided', choice: 'Stay', expectedOutcome: null });
    expect(() => Decision.parse({ ...saved, ...meta })).not.toThrow();
  });

  it('needs a decision and two options before the questions, and all three answers before a verdict', () => {
    let s = run(initFalkland('career'), { type: 'submit', text: 'job?', ai: false }, { type: 'next', ai: false, today: '2026-11-19' });
    expect(s.step).toBe('review');
    s = run(s, { type: 'edit', patch: { options: ['A', ' '] } }, { type: 'next', ai: false, today: '2026-11-19' });
    expect(s.step).toBe('review');
    s = run(s, { type: 'edit', patch: { options: ['A', 'B'] } }, { type: 'next', ai: false, today: '2026-11-19' });
    s = run(s, { type: 'edit', patch: { q1: false, q2: true } }, { type: 'next', ai: false, today: '2026-11-19' });
    expect(s.step).toBe('questions');
    s = run(s, { type: 'edit', patch: { q3: false } }, { type: 'next', ai: false, today: '2026-11-19' });
    expect(s.step).toBe('park'); // no AI: straight to the manual find-out list
  });

  it('falls back to a manual find-out list and walks back a step at a time', () => {
    let s = toQuestions(true);
    s = run(s, { type: 'edit', patch: { q1: false, q2: true, q3: true } }, { type: 'next', ai: true, today: '2026-11-19' }, { type: 'ai_fail', reason: 'over_cap' });
    expect(s).toMatchObject({ step: 'park', notice: 'over_cap' });
    s = run(s, { type: 'back' });
    expect(s).toMatchObject({ step: 'questions', notice: null });
    expect(run(s, { type: 'back' }, { type: 'back' }).step).toBe('input');
  });
});
