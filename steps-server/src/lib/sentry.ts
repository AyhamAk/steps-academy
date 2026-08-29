import * as Sentry from "@sentry/node";

import { env } from "../config/env";

/**
 * API crash reporting.
 *
 * `sendDefaultPii` stays false so request bodies, headers and client IPs are
 * never attached: this API carries children's names, guardian phone numbers and
 * signed photo URLs, none of which belong in a third-party error tracker.
 *
 * No SENTRY_DSN means no reporting, which is the normal state locally.
 */
export const SENTRY_ENABLED = Boolean(process.env.SENTRY_DSN);

export function initSentry(): void {
  if (!SENTRY_ENABLED) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.nodeEnv,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
  });
}

/**
 * Reports an error that the request pipeline has already handled.
 *
 * Only the authenticated user's opaque id is attached — enough to tell whether
 * a failure is one account's problem or everyone's, and nothing more.
 */
export function captureError(error: unknown, userId?: string): void {
  if (!SENTRY_ENABLED) return;

  Sentry.withScope((scope) => {
    if (userId) scope.setUser({ id: userId });
    Sentry.captureException(error);
  });
}
