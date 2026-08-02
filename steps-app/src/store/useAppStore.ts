import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppState = {
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      setHasOnboarded: (value) => set({ hasOnboarded: value }),
    }),
    {
      name: "steps-app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
