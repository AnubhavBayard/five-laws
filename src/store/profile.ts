import { Preferences } from '@capacitor/preferences';
import { LifeArea, LifeStage } from '@shared/laws';
import { z } from 'zod';
import { create } from 'zustand';

// ponytail: profile lives in Preferences until the SQLite user_profile table lands in Milestone 2.
const KEY = 'profile.v1';

export const Profile = z.object({
  lifeStage: LifeStage,
  areas: z.array(LifeArea).min(1),
  checkinTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  aiEnabled: z.boolean(),
  onboardedAt: z.iso.datetime(),
});
export type Profile = z.infer<typeof Profile>;

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

type ProfileState = {
  loaded: boolean;
  profile: Profile | null;
  load: () => Promise<void>;
  save: (p: Profile) => Promise<void>;
};

export const useProfile = create<ProfileState>((set) => ({
  loaded: false,
  profile: null,
  load: async () => {
    const { value } = await Preferences.get({ key: KEY });
    // Corrupt or old shape: treat as not onboarded.
    const parsed = Profile.safeParse(value ? safeJson(value) : null);
    set({ loaded: true, profile: parsed.success ? parsed.data : null });
  },
  save: async (p) => {
    const profile = Profile.parse(p);
    await Preferences.set({ key: KEY, value: JSON.stringify(profile) });
    set({ profile });
  },
}));
