import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { Translations } from "../i18n/translations";
import { AppNotification } from "./notificationsApi";

const SEEN_KEY = "steps-seen-notification-ids";
/** Enough to cover a long backlog without the list growing forever. */
const SEEN_LIMIT = 200;

/**
 * The one-line summary a banner shows, matching the wording of the same row in
 * the notifications list so the two never disagree.
 */
function bodyFor(notification: AppNotification, t: Translations): string {
  switch (notification.type) {
    case "photo":
      return t.notifications.itemPhoto(notification.childName ?? "");
    case "announcement":
      return t.notifications.itemAnnouncement;
    case "event":
      return t.notifications.itemEvent(notification.eventName ?? "");
    case "course":
      return t.notifications.itemCourse(
        notification.childName ?? "",
        notification.courseName ?? ""
      );
  }
}

async function readSeen(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Raises a banner for anything that has arrived since the last check.
 *
 * These are *local* notifications, posted by the app to the system tray. They
 * need no FCM credentials, which is why they work today — remote push does
 * not, and cannot until the project has a Firebase config baked into a build.
 * The tradeoff is that they only fire while the app is running; a banner for a
 * closed app is what remote push buys.
 *
 * The first run after install records everything as seen without notifying, so
 * a new sign-in doesn't produce a burst of banners for old history.
 */
export async function raiseBannersForNew(
  notifications: AppNotification[],
  t: Translations
): Promise<void> {
  if (notifications.length === 0) return;

  // Android 13+ needs POST_NOTIFICATIONS. The push registration asks for it
  // on sign-in; if it was declined, record everything as seen anyway so
  // granting it later does not unleash the whole backlog at once.
  const { status } = await Notifications.getPermissionsAsync();
  const canNotify = status === "granted";

  const seen = await readSeen();
  const seenSet = new Set(seen);
  const isFirstRun = seen.length === 0;

  const fresh = notifications.filter((n) => !seenSet.has(n.id) && !n.read);

  if (!isFirstRun && canNotify) {
    // Oldest first, so a burst arrives in the order it happened.
    for (const notification of [...fresh].reverse()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Steps Academy",
          body: bodyFor(notification, t),
          // The default system tone. A custom sound would need an asset
          // bundled into the native build.
          sound: "default",
          data: {
            type: notification.type,
            eventId: notification.eventId,
            courseId: notification.courseId,
          },
        },
        // null means "now" rather than on a schedule.
        trigger: null,
      });
    }
  }

  const merged = [...notifications.map((n) => n.id), ...seen].slice(0, SEEN_LIMIT);
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(merged));
  } catch {
    // A failed write just means one banner may repeat; not worth surfacing.
  }
}

/** Forgets the banner history, so a new account doesn't inherit the last one's. */
export async function resetSeenNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_KEY);
  } catch {
    // Nothing actionable.
  }
}
