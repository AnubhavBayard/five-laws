import { setDb } from '../db/client';
import type { UserProfile } from '../db/entities';
import { migratedTestDb } from '../db/testDb';
import { useProfile } from './profile';

const valid: UserProfile = {
  lifeStage: 'student',
  areas: ['studies', 'money'],
  checkinTime: '21:00',
  aiEnabled: true,
  aiConsentAt: null,
  unloadReminder: false,
  onboardedAt: '2026-11-18T10:00:00.000Z',
};

describe('profile store', () => {
  beforeEach(async () => {
    setDb(await migratedTestDb());
    useProfile.setState({ loaded: false, profile: null });
  });

  it('saves, overwrites and loads the single profile', async () => {
    await useProfile.getState().save(valid);
    await useProfile.getState().save({ ...valid, checkinTime: '08:30' });
    useProfile.setState({ profile: null });
    await useProfile.getState().load();
    expect(useProfile.getState().profile).toEqual({ ...valid, checkinTime: '08:30' });
  });

  it('rejects a profile with no areas or a bad time', async () => {
    await expect(useProfile.getState().save({ ...valid, areas: [] })).rejects.toThrow();
    await expect(useProfile.getState().save({ ...valid, checkinTime: '25:00' })).rejects.toThrow();
  });

  it('loads as not onboarded when nothing is saved', async () => {
    await useProfile.getState().load();
    expect(useProfile.getState()).toMatchObject({ loaded: true, profile: null });
  });
});
