import type { LifeArea } from '@shared/laws';
import type { FailReason } from '@shared/steps';
import type { AiEvent } from '../ai/runStep';
import type { Problem } from '../db/entities';
import { filled, toTags } from '../lib/text';

export type ProblemDraft = Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>;

export type KidlinState = {
  step: 'input' | 'clarifying' | 'clarify' | 'structuring' | 'review' | 'saved';
  draft: ProblemDraft;
  notice: FailReason | null;
  savedId: string | null;
};

export type KidlinEvent =
  | { type: 'submit'; text: string; ai: boolean }
  | AiEvent<'clarify_problem' | 'structure_problem'>
  | { type: 'answer'; index: number; a: string }
  | { type: 'edit'; patch: Partial<ProblemDraft> }
  | { type: 'next'; ai: boolean }
  | { type: 'back' }
  | { type: 'saved'; id: string };

export function initKidlin(lifeArea: LifeArea): KidlinState {
  return {
    step: 'input',
    notice: null,
    savedId: null,
    draft: { lifeArea, rant: '', clarifyQA: [], whatIsHappening: '', solvedLooksLike: '', inMyControl: '', nextStep: '', tags: [], status: 'open', resolvedAt: null },
  };
}

export function kidlin(s: KidlinState, e: KidlinEvent): KidlinState {
  const d = s.draft;
  switch (e.type) {
    case 'submit': {
      const rant = e.text.trim();
      if (s.step !== 'input' || !rant) return s;
      return { ...s, notice: null, step: e.ai ? 'clarifying' : 'review', draft: { ...d, rant, clarifyQA: [] } };
    }
    case 'ai_ok':
      if (s.step === 'clarifying' && e.stepId === 'clarify_problem') {
        return { ...s, step: 'clarify', draft: { ...d, clarifyQA: e.output.questions.map((q) => ({ q, a: '' })) } };
      }
      if (s.step === 'structuring' && e.stepId === 'structure_problem') return { ...s, step: 'review', draft: { ...d, ...e.output } };
      return s;
    case 'ai_fail':
      return s.step === 'clarifying' || s.step === 'structuring' ? { ...s, step: 'review', notice: e.reason } : s;
    case 'answer':
      return s.step === 'clarify' ? { ...s, draft: { ...d, clarifyQA: d.clarifyQA.map((x, i) => (i === e.index ? { ...x, a: e.a } : x)) } } : s;
    case 'edit':
      return s.step === 'review' || s.step === 'input' ? { ...s, draft: { ...d, ...e.patch } } : s;
    case 'next':
      return s.step === 'clarify' ? { ...s, step: e.ai ? 'structuring' : 'review' } : s;
    case 'back':
      if (s.step === 'clarify') return { ...s, step: 'input' };
      if (s.step === 'review') return { ...s, step: d.clarifyQA.length ? 'clarify' : 'input', notice: null };
      return s;
    case 'saved':
      return s.step === 'review' ? { ...s, step: 'saved', savedId: e.id } : s;
  }
}

export const canSaveProblem = (d: ProblemDraft) => d.whatIsHappening.trim() !== '' && d.nextStep.trim() !== '';

export function finishProblem(d: ProblemDraft): ProblemDraft {
  return {
    ...d,
    clarifyQA: d.clarifyQA.map(({ q, a }) => ({ q, a: a.trim() })).filter((x) => x.a),
    whatIsHappening: d.whatIsHappening.trim(),
    solvedLooksLike: d.solvedLooksLike.trim(),
    inMyControl: d.inMyControl.trim(),
    nextStep: d.nextStep.trim(),
    tags: toTags(filled(d.tags)),
  };
}
