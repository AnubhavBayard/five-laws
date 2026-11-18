import type { Decision } from '../db/entities';

type Verdict = NonNullable<Decision['verdict']>;

export const VERDICT_COPY: Record<Verdict, { title: string; body: string }> = {
  decide_now: {
    title: 'Decide now.',
    body: 'Waiting would cost you something, or it would teach you nothing on a choice that is hard to undo. Give it your full attention today and make the call.',
  },
  park: {
    title: 'Park it.',
    body: 'Nothing breaks while this stays open, and waiting brings you facts for free. Write down what to find out and pick a day to come back.',
  },
  pick_one: {
    title: 'Pick one and move on.',
    body: "Waiting won't teach you anything new, and you can change course later. Choose the option that feels right enough and spend your energy elsewhere.",
  },
};

/** Shown instead of the AI review when it isn't available: the same checks, done by the user. */
export const SELF_CHECK = [
  'Read it out loud. Circle any word a twelve-year-old wouldn’t know, and explain it in plain words.',
  'Look for “basically”, “somehow”, “kind of” and “stuff”. That’s where your understanding stops.',
  'Write the one question you’d least like someone to ask you about this.',
];

export const SHELF_INTRO =
  'These are the beliefs you’re bringing in. You aren’t throwing them away; you’re putting them on the shelf until the lesson is over.';
