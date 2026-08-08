import "../../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { I18nManager } from "react-native";

import { Colors } from "../constants/Colors";
import { AUTH_ENABLED } from "../constants/flags";
import { applyLocaleDirection } from "../i18n/applyLocaleDirection";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { updatePushTokenRequest } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import { isRTLLocale, useLocaleStore } from "../store/localeStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function useAuthGate(ready: boolean) {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    // The root Stack only mounts once `ready` is true (see RootLayout below) —
    // navigating any earlier throws "attempted to navigate before mounting the root layout".
    if (!ready) return;
    const inAuthScreen = segments[0] === "auth";
    if (!token && !inAuthScreen) {
      router.replace("/auth");
    } else if (token && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [token, ready, segments]);
}

// Reconciles the native RTL flag against the persisted language choice once,
// right after hydration — covers cases where the two got out of sync (fresh
// install, restored backup, etc). Normal language switches are handled
// directly by the Profile screen's language picker, not this effect.
function useRTLReconciliation(ready: boolean) {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    if (!ready) return;
    if (I18nManager.isRTL !== isRTLLocale(locale)) {
      applyLocaleDirection(locale);
    }
  }, [ready]);
}

// Registers this device for push notifications once the user is signed in,
// and sends the token to the backend so it can target this device.
function usePushRegistration(token: string | null) {
  useEffect(() => {
    if (!token) return;
    registerForPushNotificationsAsync().then((pushToken) => {
      if (pushToken) updatePushTokenRequest(pushToken).catch(() => {});
    });
  }, [token]);
}

// A tap on a push notification (app backgrounded or killed) should land on
// the same screen as tapping its in-app equivalent in the notifications list.
function useNotificationTapNavigation() {
  const router = useRouter();
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId;
      if (typeof eventId === "string") router.push(`/gallery/${eventId}`);
    });
    return () => subscription.remove();
  }, [router]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const localeHasHydrated = useLocaleStore((state) => state.hasHydrated);
  const ready = fontsLoaded && hasHydrated && localeHasHydrated;
  const token = useAuthStore((state) => state.token);

  useAuthGate(ready);
  useRTLReconciliation(ready);
  usePushRegistration(token);
  useNotificationTapNavigation();

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </QueryClientProvider>
  );
}
