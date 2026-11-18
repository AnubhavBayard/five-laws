import { StepContext, STEP_IDS, STEPS } from '../supabase/functions/_shared/steps';
import { FIXTURES } from './fixtures';

describe('eval fixtures', () => {
  it.each(STEP_IDS)('%s has ten fixtures that the step accepts', (stepId) => {
    const fixtures = FIXTURES[stepId];
    expect(fixtures).toHaveLength(10);
    for (const f of fixtures) {
      expect(STEPS[stepId].input.safeParse(f.input).success).toBe(true);
      expect(StepContext.safeParse({ lifeStage: f.stage }).success).toBe(true);
    }
  });

  it('labels every routing fixture with the expected law', () => {
    expect(FIXTURES.route_checkin.every((f) => f.law)).toBe(true);
  });
});
