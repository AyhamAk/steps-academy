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
  /** Nursery families: says which roster child they belong to. */
  inviteCode?: string;
  /** Course families, who have no code: the child they are signing up. */
  child?: { name: string; birthDate: string };
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

/** Phone sign-in, step 1: text a code to this number. */
export async function startPhoneSignInRequest(phone: string, locale: string) {
  await api.post("/api/auth/phone/start", { phone, locale });
}

/**
 * Phone sign-in, step 2. A known number comes back signed in; a new one gets
 * a short-lived signupToken that proves the number was verified, plus the
 * children whose guardian phones include it (empty for course families).
 */
export async function verifyPhoneSignInRequest(phone: string, code: string) {
  const { data } = await api.post<
    AuthResponse | { signupToken: string; matchedChildren?: string[] }
  >(
    "/api/auth/phone/verify",
    { phone, code }
  );
  return data;
}

/**
 * Phone sign-up, final step: the name for a verified new number, and the child
 * unless the academy already has this number on one.
 */
export async function registerWithPhoneRequest(input: {
  signupToken: string;
  firstName: string;
  familyName: string;
  child?: { name: string; birthDate: string };
}) {
  const { data } = await api.post<AuthResponse>("/api/auth/phone/register", input);
  return data;
}
