import * as Sentry from "@sentry/react-native";

/**
 * Crash reporting.
 *
 * Deliberately conservative about what leaves the device: this app is about
 * photographs of other people's children, so nothing that could carry a face,
 * a child's name or a parent's contact details is allowed into a crash report.
 * Concretely that rules out session replay, screenshots and view hierarchies,
 * and `sendDefaultPii` stays false so the SDK never attaches IP addresses or
 * request bodies on its own. What we do attach is the user's opaque id, which
 * is what makes "one parent is crashing" distinguishable from "everyone is".
 *
 * No DSN means no reporting — that is the normal state in development and in
 * Expo Go, and it must never be a crash of its own.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const SENTRY_ENABLED = Boolean(dsn);

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    // `preview` builds are the internal testers, `production` is the store. Both
    // report, but they need to be tellable apart in the Sentry issue list.
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? "production",
    sendDefaultPii: false,
    // A school app makes a few dozen requests per session, not thousands, so
    // full tracing costs nothing and is worth having when a parent reports
    // that "the gallery is slow".
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    attachScreenshot: false,
    attachViewHierarchy: false,
  });
}

/** Ties crashes to an account without recording anything identifying. */
export function setSentryUser(userId: string | null): void {
  if (!SENTRY_ENABLED) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
