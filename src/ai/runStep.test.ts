import type { UserProfile } from '../db/entities';
import { useProfile } from '../store/profile';

const invoke = vi.fn();
const signInAnonymously = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: null } }), signInAnonymously },
    functions: { invoke },
  }),
}));
vi.mock('@capacitor/preferences', () => ({ Preferences: {} }));
vi.mock('../db/repos', () => ({ logAiStep: () => Promise.resolve() }));

const profile: UserProfile = {
  lifeStage: 'freelancer',
  areas: ['money'],
  checkinTime: '21:00',
  aiEnabled: true,
  aiConsentAt: '2026-11-19T10:00:00.000Z',
  onboardedAt: '2026-11-19T10:00:00.000Z',
};
const input = { goal: 'Launch my portfolio site' };
const plan = { subgoals: ['Pick three projects', 'Write the about page'], nextAction: 'List every project from this year' };

describe('runStep', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    useProfile.setState({ profile });
    invoke.mockReset();
  });

  it('falls back without calling the server when AI is off, unconsented or offline', async () => {
    const { runStep } = await import('./runStep');
    useProfile.setState({ profile: { ...profile, aiEnabled: false } });
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'off' });
    useProfile.setState({ profile: { ...profile, aiConsentAt: null } });
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'consent' });
    useProfile.setState({ profile });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'offline' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('signs in anonymously and returns re-validated output', async () => {
    const { runStep } = await import('./runStep');
    invoke.mockResolvedValue({ data: { ok: true, output: plan, meta: { model: 'm' } }, error: null });
    expect(await runStep('break_goal', input)).toEqual({ ok: true, output: plan });
    expect(signInAnonymously).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith('ai-step', expect.objectContaining({ body: { stepId: 'break_goal', input, context: { lifeStage: 'freelancer' } } }));
  });

  it('rejects server output that does not match the schema', async () => {
    const { runStep } = await import('./runStep');
    invoke.mockResolvedValue({ data: { ok: true, output: { subgoals: ['only one'] } }, error: null });
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('passes server failures through and maps transport errors to upstream', async () => {
    const { runStep } = await import('./runStep');
    invoke.mockResolvedValue({ data: { ok: false, reason: 'over_cap' }, error: null });
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'over_cap' });
    invoke.mockResolvedValue({ data: null, error: new Error('timed out') });
    expect(await runStep('break_goal', input)).toEqual({ ok: false, reason: 'upstream' });
  });
});
