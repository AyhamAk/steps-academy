import axios from "axios";
import { useCallback, useState } from "react";

import {
  googleAuthRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
} from "../services/authApi";
import { AuthUser, useAuthStore } from "../store/authStore";

type AuthResult = { token: string; user: AuthUser };

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
    return err.response.data.message;
  }
  return "Something went wrong. Please try again.";
}

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<AuthResult>) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        setSession(result.token, result.user);
        return true;
      } catch (err) {
        setError(extractErrorMessage(err));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const register = useCallback(
    (input: { email: string; name: string; password: string; childNames: string[] }) =>
      run(() => registerRequest(input)),
    [run]
  );

  const login = useCallback(
    (input: { email: string; password: string }) => run(() => loginRequest(input)),
    [run]
  );

  const signInWithGoogle = useCallback(
    (idToken: string) => run(() => googleAuthRequest(idToken)),
    [run]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutRequest();
    } catch {
      // token may already be invalid/expired — clear local session regardless
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }, [clearSession]);

  return {
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
    error,
    register,
    login,
    signInWithGoogle,
    logout,
  };
}
