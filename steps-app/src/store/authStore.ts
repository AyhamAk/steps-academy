import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Role = "admin" | "parent";

/** A child this account is a guardian of. Assigned by an admin, never self-declared. */
export type Child = { id: string; name: string };

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  children: Child[];
  createdAt: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Stable reference for "no children".
 *
 * A zustand selector must not build a new value: `state.user?.children ?? []`
 * returns a fresh array on every call, so the store looks changed on every
 * render and React warns about an infinite getSnapshot loop. Default outside
 * the selector, against a constant.
 */
const NO_CHILDREN: Child[] = [];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "steps-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** The signed-in parent's children. Always the same array when there are none. */
export function useChildren(): Child[] {
  return useAuthStore((state) => state.user?.children) ?? NO_CHILDREN;
}
