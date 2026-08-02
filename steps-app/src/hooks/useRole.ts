import { useAuthStore } from "../store/authStore";

export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === "admin");
}
