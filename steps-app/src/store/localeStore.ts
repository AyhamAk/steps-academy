import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Locale = "en" | "ar" | "he";

export function isRTLLocale(locale: Locale): boolean {
  return locale === "ar" || locale === "he";
}

type LocaleState = {
  locale: Locale;
  hasHydrated: boolean;
  setLocale: (locale: Locale) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      // Arabic first: most of the academy's families read Arabic. Anyone who
      // has already picked a language keeps it — this is only the starting one.
      locale: "ar",
      hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "steps-locale-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
