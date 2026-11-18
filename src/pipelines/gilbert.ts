import type { LifeArea } from '@shared/laws';
import type { FailReason } from '@shared/steps';
import type { AiEvent } from '../ai/runStep';
import type { Brief } from '../db/entities';
import { asQuestion, filled } from '../lib/text';

export type BriefDraft = Omit<Brief, 'id' | 'createdAt' | 'updatedAt'>;
export type Recipient = NonNullable<Brief['recipient']>;

export type GilbertState = {
  step: 'input' | 'building' | 'brief' | 'drafting' | 'message' | 'breaking' | 'goal' | 'saved';
  draft: BriefDraft;
  notice: FailReason | null;
  savedId: string | null;
};

export type GilbertEvent =
  | { type: 'submit'; text: string; mode: Brief['mode']; ai: boolean }
  | AiEvent<'build_brief' | 'draft_clarifying_message' | 'break_goal'>
  | { type: 'edit'; patch: Partial<BriefDraft> }
  | { type: 'next'; ai: boolean }
  | { type: 'back' }
  | { type: 'saved'; id: string };

export function initGilbert(lifeArea: LifeArea, sourceProblemId: string | null = null): GilbertState {
  return {
    step: 'input',
    notice: null,
    savedId: null,
    draft: {
      lifeArea,
      mode: 'brief',
      taskAsGiven: '',
      doneLooksLike: '',
      deadline: null,
      approver: null,
      openQuestions: [],
      recipient: null,
      message: null,
      subgoals: [],
      nextAction: null,
      sourceProblemId,
    },
  };
}

const GREETING: Record<Recipient, string> = { teacher: 'Hello,', manager: 'Hi,', client: 'Hello,', teammate: 'Hey,' };

/** Used when AI is off or its draft fails the key-term check. Asks every open question, word for word. */
export function templateMessage(recipient: Recipient, task: string, questions: string[]): string {
  const qs = filled(questions).map(asQuestion);
  const t = task.trim().replace(/[.!?]+$/, '');
  const shortTask = t.length > 120 ? `${t.slice(0, 117).trimEnd()}…` : t;
  const body = qs.length === 1 ? `Could you tell me: ${qs[0]}` : `Could you help with a few quick questions?\n\n${qs.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  return `${GREETING[recipient]}\n\nBefore I start on "${shortTask}", I want to make sure I get it right. ${body}\n\nThanks!`;
}

export function gilbert(s: GilbertState, e: GilbertEvent): GilbertState {
  const d = s.draft;
  switch (e.type) {
    case 'submit': {
      const text = e.text.trim();
      if (s.step !== 'input' || !text) return s;
      const step = e.mode === 'brief' ? (e.ai ? 'building' : 'brief') : e.ai ? 'breaking' : 'goal';
      return { ...s, step, notice: null, draft: { ...d, mode: e.mode, taskAsGiven: text } };
    }
    case 'ai_ok':
      if (s.step === 'building' && e.stepId === 'build_brief') return { ...s, step: 'brief', draft: { ...d, ...e.output } };
      if (s.step === 'drafting' && e.stepId === 'draft_clarifying_message') return { ...s, step: 'message', draft: { ...d, message: e.output.message } };
      if (s.step === 'breaking' && e.stepId === 'break_goal') return { ...s, step: 'goal', draft: { ...d, ...e.output } };
      return s;
    case 'ai_fail':
      if (s.step === 'building') return { ...s, step: 'brief', notice: e.reason };
      if (s.step === 'breaking') return { ...s, step: 'goal', notice: e.reason };
      if (s.step === 'drafting' && d.recipient) {
        return { ...s, step: 'message', notice: e.reason, draft: { ...d, message: templateMessage(d.recipient, d.taskAsGiven, d.openQuestions) } };
      }
      return s;
    case 'edit':
      return { ...s, draft: { ...d, ...e.patch } };
    case 'next':
      if (s.step !== 'brief' || !canLeaveBrief(d) || !d.recipient) return s;
      return e.ai
        ? { ...s, step: 'drafting', notice: null }
        : { ...s, step: 'message', notice: null, draft: { ...d, message: templateMessage(d.recipient, d.taskAsGiven, d.openQuestions) } };
    case 'back':
      if (s.step === 'brief' || s.step === 'goal') return { ...s, step: 'input', notice: null };
      if (s.step === 'message') return { ...s, step: 'brief', notice: null };
      return s;
    case 'saved':
      return s.step === 'message' || s.step === 'goal' ? { ...s, step: 'saved', savedId: e.id } : s;
  }
}

export const canLeaveBrief = (d: BriefDraft) => d.taskAsGiven.trim() !== '' && filled(d.openQuestions).length > 0 && d.recipient !== null;
export const canSaveMessage = (d: BriefDraft) => !!d.message?.trim();
export const canSaveGoal = (d: BriefDraft) => d.taskAsGiven.trim() !== '' && filled(d.subgoals).length > 0 && !!d.nextAction?.trim();

/** The entity to save: fields that belong to the other mode are cleared. */
export function finishBrief(d: BriefDraft): BriefDraft {
  const t = d.taskAsGiven.trim();
  if (d.mode === 'goal') {
    return { ...d, taskAsGiven: t, doneLooksLike: '', deadline: null, approver: null, openQuestions: [], recipient: null, message: null, subgoals: filled(d.subgoals), nextAction: d.nextAction?.trim() || null };
  }
  return {
    ...d,
    taskAsGiven: t,
    doneLooksLike: d.doneLooksLike.trim(),
    deadline: d.deadline?.trim() || null,
    approver: d.approver?.trim() || null,
    openQuestions: filled(d.openQuestions).map(asQuestion),
    message: d.message?.trim() || null,
    subgoals: [],
    nextAction: null,
  };
}

/** Input for the AI draft: questions cleaned so they pass the step's "ends with ?" rule. */
export const messageInput = (d: BriefDraft & { recipient: Recipient }) => ({
  recipient: d.recipient,
  taskAsGiven: d.taskAsGiven.trim().slice(0, 300),
  openQuestions: filled(d.openQuestions).map(asQuestion),
});
