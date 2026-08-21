import "../../global.css";

import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "../i18n/useTranslation";
import { getNotifications } from "../services/notificationsApi";
import { raiseBannersForNew, resetSeenNotifications } from "../services/localNotifications";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { I18nManager, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedIntro } from "../components/ui/AnimatedIntro";
import { queryClient } from "../lib/queryClient";
import { Colors } from "../constants/Colors";
import { AUTH_ENABLED } from "../constants/flags";
import { applyLocaleDirection } from "../i18n/applyLocaleDirection";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { updateLocaleRequest, updatePushTokenRequest } from "../services/authApi";
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

/**
 * Registers this device for push once someone is signed in.
 *
 * Keyed on the user id, not just the auth token: a push token belongs to an
 * account *and* a device, and logging out clears it server-side. Without this,
 * signing in as a second person on the same phone left that account with no
 * token at all — the server had nowhere to send their notifications, so they
 * silently received none.
 */
function usePushRegistration(
  token: string | null,
  userId: string | null,
  locale: string,
  onPushReady: (ready: boolean) => void
) {
  useEffect(() => {
    if (!token || !userId) return;
    registerForPushNotificationsAsync().then((pushToken) => {
      // Whether this device can receive server push decides whether the local
      // poller below needs to do anything at all.
      onPushReady(!!pushToken);
      if (pushToken) updatePushTokenRequest(pushToken, locale).catch(() => {});
    });
  }, [token, userId, locale, onPushReady]);
}

/**
 * Keeps the server's idea of the parent's language in step with the app's.
 *
 * Push copy is rendered by the operating system, so it has to be written in
 * the right language before it is sent — the device cannot translate it on
 * arrival the way in-app text is translated.
 */
function useLocaleSync(token: string | null, locale: string) {
  useEffect(() => {
    if (!token) return;
    updateLocaleRequest(locale).catch(() => {});
  }, [token, locale]);
}

// A tap on a push notification (app backgrounded or killed) should land on
// the same screen as tapping its in-app equivalent in the notifications list.
/**
 * Polls for new notifications and raises a system banner for each one.
 *
 * Covers the case remote push cannot: the app is open, something happens, and
 * the parent should see a banner rather than only a number on a bell they may
 * not look at.
 *
 * Must be called from inside the QueryClientProvider — see NotificationBanners
 * below.
 */
function useNotificationBanners(token: string | null, enabled: boolean) {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!token && enabled,
    refetchInterval: 30_000,
    // Keep polling in the background so a banner can still arrive while the
    // parent is on another screen.
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!token || !data) return;
    void raiseBannersForNew(data.notifications, t);
  }, [token, data, t]);

  // A different account must not inherit the previous one's banner history.
  useEffect(() => {
    if (!token) void resetSeenNotifications();
  }, [token]);
}

/**
 * Renders nothing; exists so the banner poller runs *inside* the
 * QueryClientProvider.
 *
 * Calling the hook from RootLayout put a useQuery in the same component that
 * renders the provider, so it resolved no client and threw on launch — the app
 * closed itself the moment it opened.
 */
function NotificationBanners({ token, enabled }: { token: string | null; enabled: boolean }) {
  useNotificationBanners(token, enabled);
  return null;
}

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
  const userId = useAuthStore((state) => state.user?.id ?? null);
  // The server pushes for every notification it creates, so local banners are
  // a fallback for devices that cannot receive push — not a second copy of it.
  const [canReceivePush, setCanReceivePush] = useState(false);
  const locale = useLocaleStore((state) => state.locale);
  usePushRegistration(token, userId, locale, setCanReceivePush);
  useLocaleSync(token, locale);
  useNotificationTapNavigation();

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required by react-native-gesture-handler: without it the pinch-to-zoom
          gestures in the photo viewer never fire on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Dark icons: the app is cream throughout, and under edge-to-edge
            the status bar itself is transparent. */}
        <StatusBar style="dark" />
        <NotificationBanners token={token} enabled={!canReceivePush} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
        {isIntroDone ? null : <AnimatedIntro onDone={() => setIsIntroDone(true)} />}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
