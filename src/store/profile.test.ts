import { Preferences } from '@capacitor/preferences';
import { useProfile, type Profile } from './profile';

const valid: Profile = {
  lifeStage: 'student',
  areas: ['studies', 'money'],
  checkinTime: '21:00',
  aiEnabled: true,
  onboardedAt: '2026-11-18T10:00:00.000Z',
};

describe('profile store', () => {
  beforeEach(async () => {
    await Preferences.clear();
    useProfile.setState({ loaded: false, profile: null });
  });

  it('saves and loads a profile', async () => {
    await useProfile.getState().save(valid);
    useProfile.setState({ profile: null });
    await useProfile.getState().load();
    expect(useProfile.getState().profile).toEqual(valid);
  });

  it('rejects a profile with no areas or a bad time', async () => {
    await expect(useProfile.getState().save({ ...valid, areas: [] })).rejects.toThrow();
    await expect(useProfile.getState().save({ ...valid, checkinTime: '25:00' })).rejects.toThrow();
  });

  it('treats corrupt stored data as not onboarded', async () => {
    await Preferences.set({ key: 'profile.v1', value: '{"lifeStage":"pirate"}' });
    await useProfile.getState().load();
    expect(useProfile.getState()).toMatchObject({ loaded: true, profile: null });
  });
});
