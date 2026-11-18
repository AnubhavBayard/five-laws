import { create } from 'zustand';

/** A path to open, set from outside React (a notification tap) and consumed by DeepLinks inside the router. */
export const useDeepLink = create<{ path: string | null; open: (path: string) => void; clear: () => void }>((set) => ({
  path: null,
  open: (path) => set({ path }),
  clear: () => set({ path: null }),
}));
