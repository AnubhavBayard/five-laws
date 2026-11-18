import type { LifeArea } from '@shared/laws';
import type { FailReason, StepOutput } from '@shared/steps';
import type { Decision } from '../db/entities';
import { addDays } from '../lib/dates';
import { filled } from '../lib/text';
import { verdict } from './falkland.verdict';

export type DecisionDraft = Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>;

export type FalklandState = {
  step: 'input' | 'extracting' | 'review' | 'questions' | 'finding' | 'park' | 'decide' | 'saved';
  text: string;
  draft: DecisionDraft;
  notice: FailReason | null;
  savedId: string | null;
};

export type FalklandEvent =
  | { type: 'submit'; text: string; ai: boolean }
  | { type: 'ai_ok'; output: StepOutput<'extract_decision'> | StepOutput<'what_to_find_out'> }
  | { type: 'ai_fail'; reason: FailReason | null }
  | { type: 'edit'; patch: Partial<DecisionDraft> }
  | { type: 'next'; ai: boolean; today: string }
  | { type: 'back' }
  | { type: 'saved'; id: string };

export const PARK_DAYS = 7;

export function initFalkland(lifeArea: LifeArea): FalklandState {
  return {
    step: 'input',
    text: '',
    notice: null,
    savedId: null,
    draft: {
      lifeArea,
      decision: '',
      options: [],
      unknowns: [],
      q1: null,
      q2: null,
      q3: null,
      verdict: null,
      revisitOn: null,
      findOut: [],
      postponeCount: 0,
      status: 'open',
      choice: null,
      expectedOutcome: null,
      reviewOn: null,
      actualOutcome: null,
    },
  };
}

const BACK: Partial<Record<FalklandState['step'], FalklandState['step']>> = {
  review: 'input',
  questions: 'review',
  park: 'questions',
  decide: 'questions',
};

export function falkland(s: FalklandState, e: FalklandEvent): FalklandState {
  const d = s.draft;
  switch (e.type) {
    case 'submit': {
      const text = e.text.trim();
      if (s.step !== 'input' || !text) return s;
      return { ...s, text, notice: null, step: e.ai ? 'extracting' : 'review', draft: { ...d, decision: text } };
    }
    case 'ai_ok':
      if (s.step === 'extracting' && 'decision' in e.output) {
        const { decision, options, unknowns } = e.output;
        return { ...s, step: 'review', draft: { ...d, decision, options, unknowns } };
      }
      if (s.step === 'finding' && 'items' in e.output) return { ...s, step: 'park', draft: { ...d, findOut: e.output.items } };
      return s;
    case 'ai_fail':
      if (s.step === 'extracting') return { ...s, step: 'review', notice: e.reason };
      if (s.step === 'finding') return { ...s, step: 'park', notice: e.reason };
      return s;
    case 'edit':
      return { ...s, draft: { ...d, ...e.patch } };
    case 'next':
      if (s.step === 'review' && canLeaveReview(d)) return { ...s, step: 'questions', notice: null };
      if (s.step === 'questions' && d.q1 !== null && d.q2 !== null && d.q3 !== null) {
        const v = verdict({ q1: d.q1, q2: d.q2, q3: d.q3 });
        if (v !== 'park') return { ...s, step: 'decide', draft: { ...d, verdict: v } };
        const draft = { ...d, verdict: v, revisitOn: d.revisitOn ?? addDays(e.today, PARK_DAYS) };
        return { ...s, step: e.ai && d.findOut.length === 0 ? 'finding' : 'park', draft };
      }
      return s;
    case 'back': {
      const to = BACK[s.step];
      return to ? { ...s, step: to, notice: null } : s;
    }
    case 'saved':
      return s.step === 'park' || s.step === 'decide' ? { ...s, step: 'saved', savedId: e.id } : s;
  }
}

export const canLeaveReview = (d: DecisionDraft) => d.decision.trim() !== '' && filled(d.options).length >= 2;
export const canPark = (d: DecisionDraft) => d.revisitOn !== null && d.revisitOn !== '';
export const canDecide = (d: DecisionDraft) => !!d.choice && filled(d.options).includes(d.choice);

/** The entity to save, with status set from the verdict and empty list items dropped. */
export function finishDecision(d: DecisionDraft): DecisionDraft {
  const parked = d.verdict === 'park';
  return {
    ...d,
    decision: d.decision.trim(),
    options: filled(d.options),
    unknowns: filled(d.unknowns),
    findOut: parked ? filled(d.findOut) : [],
    revisitOn: parked ? d.revisitOn : null,
    status: parked ? 'parked' : 'decided',
    choice: parked ? null : d.choice,
    expectedOutcome: parked ? null : d.expectedOutcome?.trim() || null,
    reviewOn: parked ? null : d.reviewOn || null,
  };
}
