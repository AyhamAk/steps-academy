import { prisma } from "../lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 365;

/**
 * Usage events are kept for twelve months, then deleted.
 *
 * A family's events also disappear the moment their account does — that is a
 * database cascade on AnalyticsEvent.userId, not something this job has to
 * remember to do.
 */
export async function purgeOldAnalytics(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS);
    const { count } = await prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      console.log(`[analytics] purged ${count} events older than ${RETENTION_DAYS} days`);
    }
  } catch (error) {
    // A failed sweep must never take the API down; the next one retries.
    console.error("[analytics] purge failed:", error);
  }
}

/** Runs at boot, then daily. */
export function scheduleAnalyticsPurge(): void {
  void purgeOldAnalytics();
  const timer = setInterval(() => void purgeOldAnalytics(), DAY_MS);
  timer.unref?.();
}
