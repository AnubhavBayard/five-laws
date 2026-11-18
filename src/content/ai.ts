import type { FailReason } from '@shared/steps';

/** Shown wherever the user turns AI help on. Keep it true to what ai-step actually sends and stores. */
export const AI_CONSENT = {
  title: 'Use AI help?',
  toggle: 'Use AI help',
  points: [
    'When you tap an AI step, only the text for that step is sent to our server and on to an AI model. Your journal is never uploaded.',
    'Nothing you send is stored on our server. We only count how many requests you make each day.',
    'The AI only suggests. You check and edit everything before it is saved.',
    'Every tool also works without AI. You can turn this off at any time.',
  ],
};

/** Shown above a form the AI was asked to fill but didn't. null means the user chose to write it themselves. */
export function aiFailNotice(reason: FailReason | null): string | null {
  switch (reason) {
    case null:
      return null;
    case 'over_cap':
      return "You've used today's AI help. Fill this in yourself; it works just the same.";
    case 'invalid':
      return "The AI's answer didn't hold up, so we threw it away. Fill this in yourself.";
    case 'timeout':
    case 'upstream':
      return "The AI didn't answer in time. Fill this in yourself.";
    default:
      return "AI help isn't available right now. Fill this in yourself.";
  }
}
