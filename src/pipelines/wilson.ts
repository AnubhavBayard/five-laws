import type { LifeArea } from '@shared/laws';
import type { FailReason } from '@shared/steps';
import type { AiEvent } from '../ai/runStep';
import { getDb } from '../db/client';
import type { LearningEntry } from '../db/entities';
import { learning, questionLog } from '../db/repos';
import { filled } from '../lib/text';

export type LearningDraft = Omit<LearningEntry, 'id' | 'createdAt' | 'updatedAt'>;

export type WilsonState = {
  step: 'input' | 'extracting' | 'shelf' | 'questioning' | 'questions' | 'explain' | 'reviewing' | 'reflect' | 'saved';
  draft: LearningDraft;
  notice: FailReason | null;
  savedId: string | null;
};

export type WilsonEvent =
  | { type: 'submit'; text: string; ai: boolean }
  | AiEvent<'extract_learning' | 'beginner_questions' | 'review_explanation'>
  | { type: 'edit'; patch: Partial<LearningDraft> }
  | { type: 'next'; ai: boolean }
  | { type: 'back' }
  | { type: 'saved'; id: string };

export const TOPIC_MAX = 120;

export function initWilson(lifeArea: LifeArea): WilsonState {
  return {
    step: 'input',
    notice: null,
    savedId: null,
    draft: { lifeArea, topic: '', assumptions: [], scaryQuestion: '', beginnerQuestions: [], explanation: '', review: null, learned: '', changedMind: false },
  };
}

const AFTER_AI: Partial<Record<WilsonState['step'], WilsonState['step']>> = { extracting: 'shelf', questioning: 'questions', reviewing: 'reflect' };
const BACK: Partial<Record<WilsonState['step'], WilsonState['step']>> = { shelf: 'input', questions: 'shelf', explain: 'questions', reflect: 'explain' };

export function wilson(s: WilsonState, e: WilsonEvent): WilsonState {
  const d = s.draft;
  switch (e.type) {
    case 'submit': {
      const text = e.text.trim();
      if (s.step !== 'input' || !text) return s;
      return { ...s, notice: null, step: e.ai ? 'extracting' : 'shelf', draft: { ...d, topic: text.slice(0, TOPIC_MAX) } };
    }
    case 'ai_ok':
      if (s.step === 'extracting' && e.stepId === 'extract_learning') return { ...s, step: 'shelf', draft: { ...d, ...e.output } };
      if (s.step === 'questioning' && e.stepId === 'beginner_questions') return { ...s, step: 'questions', draft: { ...d, beginnerQuestions: e.output.questions } };
      if (s.step === 'reviewing' && e.stepId === 'review_explanation') return { ...s, step: 'reflect', draft: { ...d, review: e.output } };
      return s;
    case 'ai_fail': {
      const to = AFTER_AI[s.step];
      return to ? { ...s, step: to, notice: e.reason } : s;
    }
    case 'edit':
      return { ...s, draft: { ...d, ...e.patch } };
    case 'next':
      if (s.step === 'shelf' && d.topic.trim()) {
        return { ...s, notice: null, step: e.ai && filled(d.beginnerQuestions).length === 0 ? 'questioning' : 'questions' };
      }
      if (s.step === 'questions') return { ...s, notice: null, step: 'explain' };
      if (s.step === 'explain' && d.explanation.trim()) return { ...s, notice: null, step: e.ai ? 'reviewing' : 'reflect' };
      return s;
    case 'back': {
      const to = BACK[s.step];
      // Going back to rewrite the explanation makes the old review stale.
      return to ? { ...s, step: to, notice: null, draft: s.step === 'reflect' ? { ...d, review: null } : d } : s;
    }
    case 'saved':
      return s.step === 'reflect' ? { ...s, step: 'saved', savedId: e.id } : s;
  }
}

export function finishLearning(d: LearningDraft): LearningDraft {
  return {
    ...d,
    topic: d.topic.trim(),
    assumptions: filled(d.assumptions),
    scaryQuestion: d.scaryQuestion.trim(),
    beginnerQuestions: filled(d.beginnerQuestions),
    explanation: d.explanation.trim(),
    learned: d.learned.trim(),
  };
}

/** Saves the entry and logs every question the user asked today, which is what the Wilson streak counts. */
export async function saveLearning(d: LearningDraft, day: string, now = new Date()) {
  const entry = finishLearning(d);
  return getDb().tx(async () => {
    const saved = await learning.create(entry, now);
    for (const text of filled([entry.scaryQuestion, ...entry.beginnerQuestions])) {
      await questionLog.create({ lifeArea: entry.lifeArea, day, learningId: saved.id, text }, now);
    }
    return saved;
  });
}
