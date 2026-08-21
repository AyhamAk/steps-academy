import { api } from "./api";
import { AuthUser } from "../store/authStore";

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export async function registerRequest(input: {
  email: string;
  name: string;
  password: string;
  /** Required. Proves the academy invited them, and says which child they belong to. */
  inviteCode: string;
}) {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  return data;
}

export async function loginRequest(input: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>("/api/auth/login", input);
  return data;
}

/** `inviteCode` is only needed the first time a given Google account signs in. */
export async function googleAuthRequest(idToken: string, inviteCode?: string) {
  const { data } = await api.post<AuthResponse>("/api/auth/google", { idToken, inviteCode });
  return data;
}

export async function changePasswordRequest(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await api.patch<{ message: string }>("/api/auth/password", input);
  return data;
}

export async function meRequest() {
  const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
  return data.user;
}

/** Permanent, immediate, and required by both app stores. */
export async function deleteAccountRequest() {
  await api.delete("/api/auth/me");
}

export async function logoutRequest() {
  await api.post("/api/auth/logout");
}

export async function updatePushTokenRequest(pushToken: string, locale: string) {
  await api.patch("/api/auth/push-token", { pushToken, locale });
}

/** Push copy is written server-side, so the server has to know the language. */
export async function updateLocaleRequest(locale: string) {
  await api.patch("/api/auth/locale", { locale });
}
