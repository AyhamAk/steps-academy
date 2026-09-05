import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Throws away every cached response.
 *
 * The client is a module-level singleton that outlives a session, so without
 * this the next person to sign in briefly sees the previous account's courses,
 * gallery and notifications before the refetch lands — an admin seeing a
 * parent's view, or one parent seeing another family's child. Must be called
 * on every session boundary: sign in, sign out, and an expired token.
 */
export function resetQueryCache(): void {
  queryClient.clear();
}

/**
 * Tells react-query when the app is in the foreground.
 *
 * `refetchOnWindowFocus` is on by default, but "window focus" is a browser
 * idea — without this bridge it never fires on a phone, so a screen left open
 * while an admin changes something on the other side showed stale data until
 * the user navigated away and back. Coming back to the app now refetches
 * anything past its staleTime.
 */
export function startQueryFocusTracking(): () => void {
  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  };
  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
}
