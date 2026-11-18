import { z } from 'zod';
import { Law, LifeArea, LifeStage } from './laws.ts';

const str = (max: number) => z.string().trim().min(1).max(max);
const userText = z.string().trim().min(1).max(4000);
const question = z.string().trim().min(2).max(200).regex(/\?$/, 'must end with "?"');

/** Context every step gets alongside its input. */
export const StepContext = z.object({ lifeStage: LifeStage });
export type StepContext = z.infer<typeof StepContext>;

export const STEPS = {
  route_checkin: {
    input: z.object({ text: userText }),
    output: z.object({
      primaryLaw: Law,
      secondaryLaw: Law.nullable(),
      confidence: z.number().min(0).max(1),
      lifeArea: LifeArea,
      cleanedText: str(300),
    }),
  },
  structure_fear: {
    input: z.object({ text: userText, today: z.iso.date() }),
    output: z.object({
      fear: str(300),
      eventDate: z.iso.date().nullable(),
      firstSign: str(300),
      ifThenPlans: z.array(str(300).regex(/^If\b/, 'must start with "If"')).min(1).max(2),
      actionThisWeek: str(300),
    }),
  },
  clarify_problem: {
    input: z.object({ rant: userText }),
    output: z.object({ questions: z.array(question).min(1).max(3) }),
  },
  structure_problem: {
    input: z.object({ rant: userText, answers: z.array(z.object({ q: str(200), a: z.string().max(1000) })).max(3) }),
    output: z.object({
      whatIsHappening: str(400),
      solvedLooksLike: str(300),
      inMyControl: str(300),
      nextStep: str(200),
      tags: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(3),
    }),
  },
  extract_learning: {
    input: z.object({ text: userText }),
    output: z.object({
      topic: str(120),
      assumptions: z.array(str(200)).min(1).max(3),
      scaryQuestion: question,
    }),
  },
  beginner_questions: {
    input: z.object({ topic: str(120), assumptions: z.array(str(200)).max(3) }),
    output: z.object({ questions: z.array(question).length(3) }),
  },
  review_explanation: {
    input: z.object({ topic: str(120), explanation: userText }),
    output: z.object({
      jargonTerms: z.array(str(60)).max(5),
      vagueParts: z.array(str(300)).max(3),
      gapQuestion: question,
    }),
  },
  extract_decision: {
    input: z.object({ text: userText }),
    output: z.object({
      decision: str(200),
      options: z.array(str(120)).min(2).max(4),
      unknowns: z.array(str(200)).max(3),
    }),
  },
  what_to_find_out: {
    input: z.object({ decision: str(200), options: z.array(str(120)).max(4), unknowns: z.array(str(200)).max(3) }),
    output: z.object({ items: z.array(str(200)).min(1).max(3) }),
  },
  build_brief: {
    input: z.object({ text: userText }),
    output: z.object({
      taskAsGiven: str(300),
      doneLooksLike: str(300),
      deadline: str(100).nullable(),
      approver: str(100).nullable(),
      openQuestions: z.array(question).min(1).max(3),
    }),
  },
  draft_clarifying_message: {
    input: z.object({
      recipient: z.enum(['teacher', 'manager', 'client', 'teammate']),
      taskAsGiven: str(300),
      openQuestions: z.array(question).min(1).max(3),
    }),
    output: z.object({ message: str(600) }),
  },
  break_goal: {
    input: z.object({ goal: userText }),
    output: z.object({ subgoals: z.array(str(200)).min(2).max(5), nextAction: str(200) }),
  },
  write_insight: {
    input: z.object({ stats: z.record(z.string().max(60), z.number()) }),
    output: z.object({ observation: str(220) }),
  },
} as const;

export type StepId = keyof typeof STEPS;
export const STEP_IDS = Object.keys(STEPS) as StepId[];
export const isStepId = (s: unknown): s is StepId => typeof s === 'string' && Object.hasOwn(STEPS, s);
export type StepInput<S extends StepId> = z.infer<(typeof STEPS)[S]['input']>;
export type StepOutput<S extends StepId> = z.infer<(typeof STEPS)[S]['output']>;

export type FailReason = 'off' | 'consent' | 'offline' | 'unknown_step' | 'bad_input' | 'too_long' | 'over_cap' | 'unauthorized' | 'timeout' | 'upstream' | 'invalid';
export type StepResult<S extends StepId = StepId> = { ok: true; output: StepOutput<S> } | { ok: false; reason: FailReason };
