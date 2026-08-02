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
  childNames: string[];
}) {
  const { data } = await api.post<AuthResponse>("/api/auth/register", input);
  return data;
}

export async function loginRequest(input: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>("/api/auth/login", input);
  return data;
}

export async function googleAuthRequest(idToken: string) {
  const { data } = await api.post<AuthResponse>("/api/auth/google", { idToken });
  return data;
}

export async function meRequest() {
  const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
  return data.user;
}

export async function logoutRequest() {
  await api.post("/api/auth/logout");
}
