import { LAWS, type Law } from '@shared/laws';
import type { AiEvent } from '../ai/runStep';

export type Suggestion = { primary: Law; secondary: Law | null; confidence: number };

export type RouterState = { step: 'input' | 'routing' | 'choose'; checkinId: string | null; suggestion: Suggestion | null };

export type RouterEvent = { type: 'submit'; checkinId: string; ai: boolean } | AiEvent<'route_checkin'> | { type: 'reset' };

export const INITIAL_ROUTER: RouterState = { step: 'input', checkinId: null, suggestion: null };

/** Below this the app doesn't call anything "suggested"; it just lists the five tools. */
export const MIN_CONFIDENCE = 0.5;

export function router(s: RouterState, e: RouterEvent): RouterState {
  switch (e.type) {
    case 'submit':
      return s.step === 'input' ? { step: e.ai ? 'routing' : 'choose', checkinId: e.checkinId, suggestion: null } : s;
    case 'ai_ok': {
      if (s.step !== 'routing') return s;
      const { primaryLaw, secondaryLaw, confidence } = e.output;
      return { ...s, step: 'choose', suggestion: { primary: primaryLaw, secondary: secondaryLaw === primaryLaw ? null : secondaryLaw, confidence } };
    }
    case 'ai_fail':
      return s.step === 'routing' ? { ...s, step: 'choose' } : s;
    case 'reset':
      return INITIAL_ROUTER;
  }
}

export type LawChoice = { law: Law; tag: 'suggested' | 'also' | null };

/** All five laws, suggested ones first when the model was confident enough. */
export function lawChoices(sg: Suggestion | null): LawChoice[] {
  const top: LawChoice[] = [];
  if (sg && sg.confidence >= MIN_CONFIDENCE) {
    top.push({ law: sg.primary, tag: 'suggested' });
    if (sg.secondary) top.push({ law: sg.secondary, tag: 'also' });
  }
  return [...top, ...LAWS.filter((l) => !top.some((t) => t.law === l)).map((law) => ({ law, tag: null }))];
}

export const ENTRY_TABLE: Record<Law, string> = {
  murphy: 'fears',
  kidlin: 'problems',
  wilson: 'learning_entries',
  falkland: 'decisions',
  gilbert: 'briefs',
};
