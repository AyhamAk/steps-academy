import axios from "axios";

import { useAuthStore } from "../store/authStore";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on an expired/invalid token: clearing the session flips `token`
// to null, which the root auth gate (see app/_layout.tsx → useAuthGate) reacts
// to by redirecting to /auth. Only act when a token was actually present, so a
// failed login/register attempt (also 401) doesn't trigger the logout path.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  }
);
