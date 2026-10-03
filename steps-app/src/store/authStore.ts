import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Role = "admin" | "parent";

/** A child this account is a guardian of. Assigned by an admin, never self-declared. */
/**
 * `birthDate` is only present once the API carrying it has been deployed, so
 * every reader must cope with it being absent rather than assuming a date.
 */
export type Child = { id: string; name: string; birthDate?: string | null };

export type AuthUser = {
  id: string;
  /** Null for families who signed up by phone. */
  email: string | null;
  /** E.164, e.g. +972501234567. Null for email accounts. */
  phone?: string | null;
  name: string;
  familyName?: string | null;
  /** False for phone sign-ups, who have no password to change. */
  hasPassword?: boolean;
  role: Role;
  children: Child[];
  createdAt: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  /** An admin looking at the app as a parent would. Changes the UI only, never access. */
  viewAsParent: boolean;
  setViewAsParent: (value: boolean) => void;
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
      viewAsParent: false,
      setViewAsParent: (value) => set({ viewAsParent: value }),
      // A different account never inherits the last one's view.
      setSession: (token, user) =>
        set((state) => ({ token, user, viewAsParent: state.user?.id === user.id && state.viewAsParent })),
      clearSession: () => set({ token: null, user: null, viewAsParent: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "steps-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user, viewAsParent: state.viewAsParent }),
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
