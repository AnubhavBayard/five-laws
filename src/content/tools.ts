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
