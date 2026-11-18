import { Law, LifeArea, LifeStage } from '@shared/laws';
import { z } from 'zod';

const day = z.iso.date(); // YYYY-MM-DD, local calendar day
const stamp = z.iso.datetime();
const text = z.string().max(4000);
const list = (max: number) => z.array(z.string().max(1000)).max(max);

export const EntryBase = z.object({ id: z.uuid(), createdAt: stamp, updatedAt: stamp, lifeArea: LifeArea });

export const UserProfile = z.object({
  lifeStage: LifeStage,
  areas: z.array(LifeArea).min(1),
  checkinTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  aiEnabled: z.boolean(),
  aiConsentAt: stamp.nullable(),
  unloadReminder: z.boolean(),
  onboardedAt: stamp,
});
export type UserProfile = z.infer<typeof UserProfile>;

export const Checkin = EntryBase.extend({
  text,
  cleanedText: text.nullable(),
  suggestedPrimary: Law.nullable(),
  suggestedSecondary: Law.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  chosenLaw: Law.nullable(),
  entryTable: z.string().nullable(),
  entryId: z.uuid().nullable(),
});

export const FearOutcome = z.enum(['happened', 'partly', 'didnt']);
export const Fear = EntryBase.extend({
  fear: text,
  eventDate: day.nullable(),
  firstSign: text,
  ifThenPlans: list(2),
  actionThisWeek: text,
  likelihood: z.number().int().min(0).max(100),
  outcome: FearOutcome.nullable(),
  resolvedAt: stamp.nullable(),
});

export const Problem = EntryBase.extend({
  rant: text,
  clarifyQA: z.array(z.object({ q: text, a: text })).max(3),
  whatIsHappening: text,
  solvedLooksLike: text,
  inMyControl: text,
  nextStep: text,
  tags: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(3),
  status: z.enum(['open', 'resolved']),
  resolvedAt: stamp.nullable(),
});

export const LearningEntry = EntryBase.extend({
  topic: text,
  assumptions: list(3),
  scaryQuestion: text,
  beginnerQuestions: list(3),
  explanation: text,
  review: z.object({ jargonTerms: list(5), vagueParts: list(3), gapQuestion: text }).nullable(),
  learned: text,
  changedMind: z.boolean(),
});

export const Verdict = z.enum(['decide_now', 'park', 'pick_one']);
export const Decision = EntryBase.extend({
  decision: text,
  options: list(4),
  unknowns: list(3),
  q1: z.boolean().nullable(),
  q2: z.boolean().nullable(),
  q3: z.boolean().nullable(),
  verdict: Verdict.nullable(),
  revisitOn: day.nullable(),
  findOut: list(3),
  postponeCount: z.number().int().min(0),
  status: z.enum(['open', 'parked', 'decided', 'reviewed']),
  choice: text.nullable(),
  expectedOutcome: text.nullable(),
  reviewOn: day.nullable(),
  actualOutcome: text.nullable(),
});

export const Recipient = z.enum(['teacher', 'manager', 'client', 'teammate']);
export const Brief = EntryBase.extend({
  mode: z.enum(['brief', 'goal']),
  taskAsGiven: text,
  doneLooksLike: text,
  deadline: text.nullable(),
  approver: text.nullable(),
  openQuestions: list(3),
  recipient: Recipient.nullable(),
  message: text.nullable(),
  subgoals: list(5),
  nextAction: text.nullable(),
  sourceProblemId: z.uuid().nullable(),
});

export const QuestionLog = EntryBase.extend({ day, learningId: z.uuid().nullable(), text });

export const AiStepLog = z.object({
  id: z.uuid(),
  createdAt: stamp,
  stepId: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  latencyMs: z.number().int().min(0),
  ok: z.boolean(),
  validationPassed: z.boolean(),
  retryUsed: z.boolean(),
  reason: z.string().nullable(),
});

export type Checkin = z.infer<typeof Checkin>;
export type Fear = z.infer<typeof Fear>;
export type Problem = z.infer<typeof Problem>;
export type LearningEntry = z.infer<typeof LearningEntry>;
export type Decision = z.infer<typeof Decision>;
export type Brief = z.infer<typeof Brief>;
export type QuestionLog = z.infer<typeof QuestionLog>;
export type AiStepLog = z.infer<typeof AiStepLog>;
