import { QueryClient } from "@tanstack/react-query";

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
