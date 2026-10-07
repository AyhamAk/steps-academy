import { VIEW_SWITCH_EMAILS, VIEW_SWITCH_PHONES } from "../constants/academy";
import { useAuthStore } from "../store/authStore";

/** Whether to show the admin UI: an admin, unless they're viewing as a parent. */
export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === "admin" && !state.viewAsParent);
}

/** An admin account allowed to flip between the admin and parent views. */
export function useCanSwitchView(): boolean {
  return useAuthStore(
    (state) =>
      state.user?.role === "admin" &&
      (VIEW_SWITCH_PHONES.includes(state.user.phone ?? "") ||
        VIEW_SWITCH_EMAILS.includes(state.user.email?.toLowerCase() ?? ""))
  );
}
