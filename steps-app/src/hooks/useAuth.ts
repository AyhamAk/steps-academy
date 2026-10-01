import axios from "axios";
import { useCallback, useState } from "react";

import {
  googleAuthRequest,
  loginRequest,
  deleteAccountRequest,
  logoutRequest,
  registerRequest,
  registerWithPhoneRequest,
  startPhoneSignInRequest,
  verifyPhoneSignInRequest,
} from "../services/authApi";
import { resetQueryCache } from "../lib/queryClient";
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
        // Drop the previous account's cached data before the new session
        // starts, so nothing of theirs is ever rendered to this user.
        resetQueryCache();
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
    (input: Parameters<typeof registerRequest>[0]) => run(() => registerRequest(input)),
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

  /** Texts a sign-in code. True once the SMS is on its way. */
  const startPhoneSignIn = useCallback(async (phone: string, locale: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await startPhoneSignInRequest(phone, locale);
      return true;
    } catch (err) {
      setError(extractErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Checks the SMS code. A known number is signed in on the spot ("signedIn");
   * a new one returns the signupToken the sign-up screens finish with, and the
   * names of any children the academy already has this number on.
   */
  const verifyPhoneSignIn = useCallback(
    async (
      phone: string,
      code: string
    ): Promise<"signedIn" | { signupToken: string; matchedChildren: string[] } | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await verifyPhoneSignInRequest(phone, code);
        if ("signupToken" in result) {
          return { signupToken: result.signupToken, matchedChildren: result.matchedChildren ?? [] };
        }
        resetQueryCache();
        setSession(result.token, result.user);
        return "signedIn";
      } catch (err) {
        setError(extractErrorMessage(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setSession]
  );

  const registerWithPhone = useCallback(
    (input: Parameters<typeof registerWithPhoneRequest>[0]) =>
      run(() => registerWithPhoneRequest(input)),
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
      resetQueryCache();
      setIsLoading(false);
    }
  }, [clearSession]);

  // The session is cleared only when the server confirms the deletion, so a
  // failure leaves the user signed in and able to try again or contact us.
  const deleteAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteAccountRequest();
      clearSession();
      resetQueryCache();
    } finally {
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
    startPhoneSignIn,
    verifyPhoneSignIn,
    registerWithPhone,
    logout,
    deleteAccount,
  };
}
