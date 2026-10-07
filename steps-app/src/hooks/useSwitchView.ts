import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { meRequest } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

/**
 * Flips between the manager and parent views. The UI only — the server still
 * treats the account as a manager.
 */
export function useSwitchView() {
  const queryClient = useQueryClient();
  return async () => {
    const store = useAuthStore.getState();
    store.setViewAsParent(!store.viewAsParent);
    // Children linked since sign-in only arrive with a fresh /me.
    try {
      const fresh = await meRequest();
      if (store.token) store.setSession(store.token, fresh);
    } catch {
      // The cached account is good enough to switch views.
    }
    queryClient.invalidateQueries();
    router.replace("/(tabs)");
  };
}
