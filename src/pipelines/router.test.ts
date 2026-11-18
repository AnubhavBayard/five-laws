import { lawChoices, router, INITIAL_ROUTER } from './router';

const output = { primaryLaw: 'kidlin', secondaryLaw: 'gilbert', confidence: 0.8, lifeArea: 'career', cleanedText: 'My manager gave me a vague task.' } as const;

describe('check-in router', () => {
  it('routes with AI, ignores late answers, and resets', () => {
    let s = router(INITIAL_ROUTER, { type: 'submit', checkinId: 'c1', ai: true });
    expect(s).toEqual({ step: 'routing', checkinId: 'c1', suggestion: null });
    s = router(s, { type: 'ai_ok', stepId: 'route_checkin', output });
    expect(s).toEqual({ step: 'choose', checkinId: 'c1', suggestion: { primary: 'kidlin', secondary: 'gilbert', confidence: 0.8 } });
    expect(router(s, { type: 'ai_ok', stepId: 'route_checkin', output: { ...output, primaryLaw: 'murphy' } })).toBe(s);
    expect(router(s, { type: 'reset' })).toEqual(INITIAL_ROUTER);
  });

  it('goes straight to choosing without AI or when AI fails', () => {
    expect(router(INITIAL_ROUTER, { type: 'submit', checkinId: 'c1', ai: false }).step).toBe('choose');
    const routing = router(INITIAL_ROUTER, { type: 'submit', checkinId: 'c1', ai: true });
    expect(router(routing, { type: 'ai_fail', reason: 'timeout' })).toMatchObject({ step: 'choose', suggestion: null });
  });

  it('orders laws: suggested, then also, then the rest in chapter order', () => {
    expect(lawChoices({ primary: 'falkland', secondary: 'murphy', confidence: 0.9 })).toEqual([
      { law: 'falkland', tag: 'suggested' },
      { law: 'murphy', tag: 'also' },
      { law: 'kidlin', tag: null },
      { law: 'wilson', tag: null },
      { law: 'gilbert', tag: null },
    ]);
  });

  it('suggests nothing when the model is unsure or absent', () => {
    const plain = ['murphy', 'kidlin', 'wilson', 'falkland', 'gilbert'].map((law) => ({ law, tag: null }));
    expect(lawChoices({ primary: 'gilbert', secondary: null, confidence: 0.3 })).toEqual(plain);
    expect(lawChoices(null)).toEqual(plain);
  });
});
