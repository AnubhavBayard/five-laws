import type { LifeArea } from '@shared/laws';
import type { FailReason, StepOutput } from '@shared/steps';
import type { Fear } from '../db/entities';

export type FearDraft = Omit<Fear, 'id' | 'createdAt' | 'updatedAt'>;

export type MurphyState = {
  step: 'input' | 'structuring' | 'review' | 'saved';
  text: string;
  draft: FearDraft;
  /** Why AI didn't fill the form, when it was asked to. */
  notice: FailReason | null;
  savedId: string | null;
};

export type MurphyEvent =
  | { type: 'submit'; text: string; ai: boolean }
  | { type: 'ai_ok'; output: StepOutput<'structure_fear'> }
  | { type: 'ai_fail'; reason: FailReason | null }
  | { type: 'edit'; patch: Partial<FearDraft> }
  | { type: 'back' }
  | { type: 'saved'; id: string };

export function initMurphy(lifeArea: LifeArea): MurphyState {
  return {
    step: 'input',
    text: '',
    notice: null,
    savedId: null,
    draft: { lifeArea, fear: '', eventDate: null, firstSign: '', ifThenPlans: [], actionThisWeek: '', likelihood: 50, outcome: null, resolvedAt: null },
  };
}

export function murphy(s: MurphyState, e: MurphyEvent): MurphyState {
  switch (e.type) {
    case 'submit': {
      const text = e.text.trim();
      if (s.step !== 'input' || !text) return s;
      return { ...s, text, notice: null, step: e.ai ? 'structuring' : 'review', draft: { ...s.draft, fear: text } };
    }
    case 'ai_ok':
      return s.step === 'structuring' ? { ...s, step: 'review', draft: { ...s.draft, ...e.output } } : s;
    case 'ai_fail':
      return s.step === 'structuring' ? { ...s, step: 'review', notice: e.reason } : s;
    case 'edit':
      return s.step === 'review' || s.step === 'input' ? { ...s, draft: { ...s.draft, ...e.patch } } : s;
    case 'back':
      return s.step === 'review' ? { ...s, step: 'input', notice: null } : s;
    case 'saved':
      return s.step === 'review' ? { ...s, step: 'saved', savedId: e.id } : s;
  }
}

export const canSaveFear = (d: FearDraft) => d.fear.trim() !== '';

/** Trims text and drops empty plans before saving. */
export function finishFear(d: FearDraft): FearDraft {
  return {
    ...d,
    fear: d.fear.trim(),
    firstSign: d.firstSign.trim(),
    actionThisWeek: d.actionThisWeek.trim(),
    ifThenPlans: d.ifThenPlans.map((p) => p.trim()).filter(Boolean),
    eventDate: d.eventDate || null,
  };
}
