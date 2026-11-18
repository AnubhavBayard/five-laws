import { setDb } from '../db/client';
import { Brief, LearningEntry, Problem } from '../db/entities';
import { questionLog } from '../db/repos';
import { migratedTestDb } from '../db/testDb';
import { finishBrief, gilbert, type GilbertEvent, type GilbertState, initGilbert, messageInput, templateMessage } from './gilbert';
import { finishProblem, initKidlin, kidlin, type KidlinEvent, type KidlinState } from './kidlin';
import { initWilson, saveLearning, wilson, type WilsonEvent, type WilsonState } from './wilson';

const meta = { id: crypto.randomUUID(), createdAt: '2026-11-19T10:00:00.000Z', updatedAt: '2026-11-19T10:00:00.000Z' };

describe('Kidlin pipeline', () => {
  const run = (s: KidlinState, ...es: KidlinEvent[]) => es.reduce(kidlin, s);
  const structured = { whatIsHappening: 'My group does not reply', solvedLooksLike: 'Everyone owns a section', inMyControl: 'How I split the work', nextStep: 'Post a split in the chat', tags: ['group-project'] };

  it('asks clarifying questions, then structures the answers', () => {
    let s = run(initKidlin('studies'), { type: 'submit', text: 'my group is useless', ai: true }, { type: 'ai_ok', stepId: 'clarify_problem', output: { questions: ['Who replied last?', 'When is it due?'] } });
    expect(s).toMatchObject({ step: 'clarify', draft: { clarifyQA: [{ q: 'Who replied last?', a: '' }, { q: 'When is it due?', a: '' }] } });
    s = run(s, { type: 'answer', index: 1, a: 'Friday' }, { type: 'next', ai: true });
    expect(s.step).toBe('structuring');
    s = run(s, { type: 'ai_ok', stepId: 'clarify_problem', output: { questions: ['Late?'] } }); // wrong step: ignored
    expect(s.step).toBe('structuring');
    s = run(s, { type: 'ai_ok', stepId: 'structure_problem', output: structured });
    const saved = finishProblem(s.draft);
    expect(saved.clarifyQA).toEqual([{ q: 'When is it due?', a: 'Friday' }]);
    expect(() => Problem.parse({ ...saved, ...meta })).not.toThrow();
  });

  it('goes straight to a manual form without AI, and back to the rant', () => {
    let s = run(initKidlin('money'), { type: 'submit', text: 'rent', ai: false });
    expect(s).toMatchObject({ step: 'review', draft: { rant: 'rent', clarifyQA: [] } });
    s = run(s, { type: 'edit', patch: { tags: ['Money Stuff', ''] } });
    expect(finishProblem(s.draft).tags).toEqual(['money-stuff']);
    expect(run(s, { type: 'back' }).step).toBe('input');
  });

  it('falls back to the form if structuring fails', () => {
    const s = run(initKidlin('money'), { type: 'submit', text: 'rent', ai: true }, { type: 'ai_ok', stepId: 'clarify_problem', output: { questions: ['How much?'] } }, { type: 'next', ai: true }, { type: 'ai_fail', reason: 'invalid' });
    expect(s).toMatchObject({ step: 'review', notice: 'invalid' });
    expect(run(s, { type: 'back' }).step).toBe('clarify');
  });
});

describe('Wilson pipeline', () => {
  const run = (s: WilsonState, ...es: WilsonEvent[]) => es.reduce(wilson, s);

  it('runs every AI step in order and drops a stale review on the way back', () => {
    let s = run(
      initWilson('studies'),
      { type: 'submit', text: 'compound interest', ai: true },
      { type: 'ai_ok', stepId: 'extract_learning', output: { topic: 'Compound interest', assumptions: ['It is only for rich people'], scaryQuestion: 'What even is interest?' } },
      { type: 'next', ai: true },
    );
    expect(s.step).toBe('questioning');
    s = run(s, { type: 'ai_ok', stepId: 'beginner_questions', output: { questions: ['What is a rate?', 'Who pays it?', 'Why does it grow?'] } }, { type: 'next', ai: true });
    expect(s.step).toBe('explain');
    s = run(s, { type: 'next', ai: true });
    expect(s.step).toBe('explain'); // nothing written yet
    s = run(s, { type: 'edit', patch: { explanation: 'Money grows on itself somehow.' } }, { type: 'next', ai: true }, { type: 'ai_ok', stepId: 'review_explanation', output: { jargonTerms: [], vagueParts: ['somehow'], gapQuestion: 'How often is interest added?' } });
    expect(s).toMatchObject({ step: 'reflect', draft: { review: { vagueParts: ['somehow'] } } });
    s = run(s, { type: 'back' });
    expect(s).toMatchObject({ step: 'explain', draft: { review: null } });
  });

  it('works fully by hand and skips the question step AI once questions exist', () => {
    let s = run(initWilson('career'), { type: 'submit', text: 'x'.repeat(200), ai: false });
    expect(s.draft.topic).toHaveLength(120);
    s = run(s, { type: 'edit', patch: { beginnerQuestions: ['Already asked?'] } }, { type: 'next', ai: true });
    expect(s.step).toBe('questions');
    s = run(s, { type: 'next', ai: false }, { type: 'edit', patch: { explanation: 'Plain words.' } }, { type: 'next', ai: false });
    expect(s).toMatchObject({ step: 'reflect', draft: { review: null } });
  });

  it('saves the entry and logs each question for the streak', async () => {
    setDb(await migratedTestDb());
    const d = { ...initWilson('studies').draft, topic: 'Statistics', scaryQuestion: 'What is a p-value?', beginnerQuestions: ['What is a sample?', ' ', 'Why average?'], explanation: 'It is about guessing well.' };
    const saved = await saveLearning(d, '2026-11-19');
    expect(() => LearningEntry.parse(saved)).not.toThrow();
    const log = await questionLog.list();
    expect(log.map((q) => q.text).sort()).toEqual(['What is a p-value?', 'What is a sample?', 'Why average?']);
    expect(log.every((q) => q.day === '2026-11-19' && q.learningId === saved.id)).toBe(true);
  });
});

describe('Gilbert pipeline', () => {
  const run = (s: GilbertState, ...es: GilbertEvent[]) => es.reduce(gilbert, s);
  const brief = { taskAsGiven: 'Make the client deck', doneLooksLike: 'Ten slides', deadline: 'Friday', approver: null, openQuestions: ['Who is the audience?', 'Which brand template?'] };

  it('builds a brief, drafts the message with AI, and saves it', () => {
    let s = run(initGilbert('career'), { type: 'submit', text: 'boss said make deck', mode: 'brief', ai: true }, { type: 'ai_ok', stepId: 'build_brief', output: brief });
    expect(s.step).toBe('brief');
    s = run(s, { type: 'next', ai: true });
    expect(s.step).toBe('brief'); // needs a recipient
    s = run(s, { type: 'edit', patch: { recipient: 'manager' } }, { type: 'next', ai: true }, { type: 'ai_ok', stepId: 'draft_clarifying_message', output: { message: 'Hi! Who is the audience, and which brand template?' } });
    expect(s).toMatchObject({ step: 'message', draft: { message: 'Hi! Who is the audience, and which brand template?' } });
    const saved = finishBrief(s.draft);
    expect(saved).toMatchObject({ mode: 'brief', subgoals: [], nextAction: null });
    expect(() => Brief.parse({ ...saved, ...meta })).not.toThrow();
  });

  it('uses the code template when the AI draft fails or AI is off', () => {
    const base = run(initGilbert('career'), { type: 'submit', text: 'deck', mode: 'brief', ai: false }, { type: 'edit', patch: { ...brief, recipient: 'teacher' } });
    const off = run(base, { type: 'next', ai: false });
    const failed = run(base, { type: 'next', ai: true }, { type: 'ai_fail', reason: 'invalid' });
    const expected = templateMessage('teacher', brief.taskAsGiven, brief.openQuestions);
    expect(off.draft.message).toBe(expected);
    expect(failed).toMatchObject({ step: 'message', notice: 'invalid', draft: { message: expected } });
  });

  it('breaks a goal down and clears brief-only fields', () => {
    const s = run(initGilbert('health'), { type: 'submit', text: 'Run a 10k', mode: 'goal', ai: true }, { type: 'ai_ok', stepId: 'break_goal', output: { subgoals: ['Run 3k', 'Run 5k'], nextAction: 'Buy shoes' } });
    expect(s.step).toBe('goal');
    const saved = finishBrief({ ...s.draft, openQuestions: ['stale?'] });
    expect(saved).toMatchObject({ mode: 'goal', taskAsGiven: 'Run a 10k', openQuestions: [], message: null, subgoals: ['Run 3k', 'Run 5k'] });
    expect(() => Brief.parse({ ...saved, ...meta })).not.toThrow();
  });

  it('writes a template that asks every question and cleans AI input', () => {
    const msg = templateMessage('client', 'Redesign the landing page.', ['What is the budget', 'Who approves it?']);
    expect(msg).toBe('Hello,\n\nBefore I start on "Redesign the landing page", I want to make sure I get it right. Could you help with a few quick questions?\n\n1. What is the budget?\n2. Who approves it?\n\nThanks!');
    expect(templateMessage('teammate', 'Fix the bug', ['Which one?'])).toContain('Could you tell me: Which one?');
    expect(messageInput({ ...initGilbert('career').draft, recipient: 'client', taskAsGiven: ' x ', openQuestions: ['Budget', ''] })).toEqual({ recipient: 'client', taskAsGiven: 'x', openQuestions: ['Budget?'] });
  });
});
