import { useAuthStore } from "../store/authStore";

/** Whether to show the admin UI: an admin, unless they're viewing as a parent. */
export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === "admin" && !state.viewAsParent);
}

/** Every admin can flip between the admin and parent views. */
export function useCanSwitchView(): boolean {
  return useAuthStore((state) => state.user?.role === "admin");
}
