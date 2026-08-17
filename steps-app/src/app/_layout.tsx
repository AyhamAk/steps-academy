import "../../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { I18nManager, View } from "react-native";

import { AnimatedIntro } from "../components/ui/AnimatedIntro";
import { queryClient } from "../lib/queryClient";
import { Colors } from "../constants/Colors";
import { AUTH_ENABLED } from "../constants/flags";
import { applyLocaleDirection } from "../i18n/applyLocaleDirection";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { updatePushTokenRequest } from "../services/authApi";
import { startAnalytics, track } from "../services/analytics";
import { useAuthStore } from "../store/authStore";
import { isRTLLocale, useLocaleStore } from "../store/localeStore";

/**
 * Session lifecycle plus every route change, in one place.
 *
 * Screens do not report themselves: the router already knows where we are, and
 * one listener here cannot drift out of date the way twenty call sites would.
 */
function useUsageTracking(ready: boolean) {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    return startAnalytics();
  }, [ready]);

  useEffect(() => {
    if (!ready || !pathname) return;
    const from = previous.current;
    if (from === pathname) return;

    track("screen_view", { route: pathname, previous_route: from ?? undefined });

    // A move between two tab roots is also a tab switch. Derived here rather
    // than wired into each tab, so adding a tab needs no analytics work.
    const tabOf = (route: string | null) => {
      if (!route) return null;
      const match = route.match(/^\/\(tabs\)\/?([^/]*)/);
      if (!match) return null;
      return match[1] || "index";
    };
    const fromTab = tabOf(from);
    const toTab = tabOf(pathname);
    if (fromTab && toTab && fromTab !== toTab) {
      track("tab_switch", { from_tab: fromTab, to_tab: toTab });
    }

    previous.current = pathname;
  }, [pathname, ready]);
}

function useAuthGate(ready: boolean) {
  const token = useAuthStore((state) => state.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    // The root Stack only mounts once `ready` is true (see RootLayout below) —
    // navigating any earlier throws "attempted to navigate before mounting the root layout".
    if (!ready) return;
    // Onboarding is reached without a token by design — that's the whole point
    // of an invite flow — so it counts as an auth screen for gating purposes.
    const inAuthScreen = segments[0] === "auth" || segments[0] === "onboarding";
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
      const data = response.notification.request.content.data ?? {};
      // Same destinations as tapping the notification inside the app.
      if (data.type === "course") {
        router.push("/profile");
      } else if (typeof data.eventId === "string") {
        router.push(`/gallery/${data.eventId}`);
      } else if (data.type === "announcement") {
        router.push("/");
      }
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
  // State lives in the root component, which mounts once per launch — so the
  // intro plays on every cold start but never on a resume from background.
  const [isIntroDone, setIsIntroDone] = useState(false);

  useAuthGate(ready);
  useUsageTracking(ready);
  useRTLReconciliation(ready);
  usePushRegistration(token);
  useNotificationTapNavigation();

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
        {isIntroDone ? null : <AnimatedIntro onDone={() => setIsIntroDone(true)} />}
      </View>
    </QueryClientProvider>
  );
}
