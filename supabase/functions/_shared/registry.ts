import type { StepId } from './steps.ts';

export type Tier = 'FAST' | 'WRITER';

type StepDef = {
  tier: Tier;
  maxTokens: number;
  /** Bump when the instruction changes, so logs and evals can tell prompt versions apart. */
  promptVersion: string;
  toolName: string;
  instruction: string;
};

export const REGISTRY: Record<StepId, StepDef> = {
  route_checkin: {
    tier: 'FAST',
    maxTokens: 300,
    promptVersion: 'route_checkin@1',
    toolName: 'route_checkin',
    instruction: `Read the user's check-in and pick which law's tool fits it best.
- murphy: a fear or worry about something that might happen.
- kidlin: a problem that is happening now and feels tangled.
- wilson: something they are learning or struggling to understand.
- falkland: a decision they are stuck on.
- gilbert: a task or goal from someone else that is unclear, or a big goal with no first step.
Give a secondaryLaw only if a second tool clearly also fits, otherwise null. confidence is how sure you are of primaryLaw (0 to 1). cleanedText is the check-in rewritten as one or two plain English sentences, keeping the user's meaning and details.`,
  },
  structure_fear: {
    tier: 'WRITER',
    maxTokens: 500,
    promptVersion: 'structure_fear@1',
    toolName: 'save_fear_forecast',
    instruction: `Turn the user's worry into a fear forecast.
- fear: the specific event they fear, in one sentence.
- eventDate: when it would happen, as YYYY-MM-DD, worked out from "today" in the data. null if they gave no time.
- firstSign: the earliest warning sign they could notice.
- ifThenPlans: one or two plans, each starting "If" and containing "then".
- actionThisWeek: one small thing they can do this week to lower the risk.
Use only facts the user gave. Do not invent names, dates or numbers.`,
  },
  clarify_problem: {
    tier: 'FAST',
    maxTokens: 300,
    promptVersion: 'clarify_problem@1',
    toolName: 'ask_clarifying_questions',
    instruction: `The user wrote a messy rant about a problem. Ask one to three short, plain questions that would help them name what is actually happening, what solved would look like, and which part is in their control. Do not ask about anything they already answered. Each question ends with "?".`,
  },
  structure_problem: {
    tier: 'WRITER',
    maxTokens: 500,
    promptVersion: 'structure_problem@1',
    toolName: 'save_problem_page',
    instruction: `Using the rant and the user's answers, write their problem page.
- whatIsHappening: the problem stated plainly.
- solvedLooksLike: what it looks like when it is solved.
- inMyControl: the part the user can change.
- nextStep: one step small enough to do in the next twenty minutes, starting with a verb.
- tags: up to three lowercase-hyphenated topic tags, e.g. "group-project".
Use only what the user wrote. Do not add advice they did not ask for.`,
  },
  extract_learning: {
    tier: 'FAST',
    maxTokens: 400,
    promptVersion: 'extract_learning@1',
    toolName: 'save_learning_start',
    instruction: `The user is starting to learn something. Name the topic in a few words, list one to three assumptions or beliefs they seem to bring to it, and write the question they seem most afraid to ask (it ends with "?").`,
  },
  beginner_questions: {
    tier: 'FAST',
    maxTokens: 300,
    promptVersion: 'beginner_questions@1',
    toolName: 'save_beginner_questions',
    instruction: `Write exactly three questions a complete beginner would ask about this topic. Keep them basic and honest, even if they feel obvious. Avoid jargon. Each ends with "?".`,
  },
  review_explanation: {
    tier: 'WRITER',
    maxTokens: 400,
    promptVersion: 'review_explanation@1',
    toolName: 'review_explanation',
    instruction: `The user explained a topic in their own words. Review it.
- jargonTerms: up to five technical terms they used without explaining.
- vagueParts: up to three phrases where the explanation turns vague. Copy each phrase exactly, word for word, from their explanation.
- gapQuestion: one question that points at the biggest gap in their understanding.
Do not correct or rewrite their explanation.`,
  },
  extract_decision: {
    tier: 'FAST',
    maxTokens: 400,
    promptVersion: 'extract_decision@1',
    toolName: 'save_decision',
    instruction: `The user is stuck on a decision. State the decision as one question, list the two to four options they are choosing between, and list up to three things they don't know yet that matter for it.`,
  },
  what_to_find_out: {
    tier: 'WRITER',
    maxTokens: 300,
    promptVersion: 'what_to_find_out@1',
    toolName: 'save_find_out_list',
    instruction: `The user parked this decision until they know more. List one to three concrete things to find out before they decide, each one something they could check or ask someone about.`,
  },
  build_brief: {
    tier: 'WRITER',
    maxTokens: 500,
    promptVersion: 'build_brief@1',
    toolName: 'save_brief',
    instruction: `The user was given a task by someone else and it is unclear. Write a brief.
- taskAsGiven: the task as they were told it.
- doneLooksLike: what finished looks like, as far as the user knows.
- deadline: the deadline exactly as they stated it, or null.
- approver: who decides it is done, or null.
- openQuestions: one to three questions they should ask the person who gave the task.
Do not fill in a deadline or approver they did not mention.`,
  },
  draft_clarifying_message: {
    tier: 'WRITER',
    maxTokens: 600,
    promptVersion: 'draft_clarifying_message@1',
    toolName: 'save_message',
    instruction: `Write a short, polite message from the user to their recipient that asks every open question, in plain English. Match the tone to the recipient (teacher, manager, client or teammate). No greeting placeholders like [Name], no sign-off name. Under 600 characters.`,
  },
  break_goal: {
    tier: 'WRITER',
    maxTokens: 400,
    promptVersion: 'break_goal@1',
    toolName: 'save_goal_plan',
    instruction: `Break the user's goal into two to five sub-goals in the order they would do them, then give one next action they can start today, beginning with a verb.`,
  },
  write_insight: {
    tier: 'WRITER',
    maxTokens: 200,
    promptVersion: 'write_insight@1',
    toolName: 'save_insight',
    instruction: `Write one observation (under 220 characters) about the user's journal stats. Use only the numbers given, written exactly as given; do not calculate new ones. Be kind and plain, not cheerful.`,
  },
};
