import { create } from 'zustand';
import type { UserProfile } from '../db/entities';
import { profileRepo } from '../db/repos';

type ProfileState = {
  loaded: boolean;
  profile: UserProfile | null;
  load: () => Promise<void>;
  save: (p: UserProfile) => Promise<void>;
};

export const useProfile = create<ProfileState>((set) => ({
  loaded: false,
  profile: null,
  load: async () => {
    let profile: UserProfile | null = null;
    try {
      profile = await profileRepo.get();
    } catch {
      // Unreadable row (old or corrupt shape): run onboarding again, which overwrites it.
    }
    set({ loaded: true, profile });
  },
  save: async (p) => {
    set({ profile: await profileRepo.save(p) });
  },
}));
