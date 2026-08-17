import Constants from "expo-constants";
import { AppState, AppStateStatus, Platform } from "react-native";

import { api } from "./api";
import { useAuthStore } from "../store/authStore";
import { useLocaleStore } from "../store/localeStore";

/**
 * First-party usage events. Nothing leaves our own server.
 *
 * Adding an event is one line here plus one `track(...)` call at the site.
 * Everything else — batching, the session id, the shared props, the failure
 * handling — happens once, in this module.
 *
 * Two guarantees this file exists to keep:
 *
 * 1. **It cannot break a screen.** Every entry point is wrapped; a bad event
 *    name, a dead network or a full queue all end in silence.
 * 2. **It cannot describe a child.** Album ids are allowed; photo ids and
 *    child ids are not. The denylist below is enforced here as well as on the
 *    server, so a careless call site fails closed rather than leaking.
 */

export type EventName =
  // Session and navigation
  | "app_open"
  | "app_background"
  | "screen_view"
  | "tab_switch"
  | "language_changed"
  // Gallery
  | "album_opened"
  | "album_scrolled_to_end"
  | "photo_viewer_opened"
  | "photo_viewer_closed"
  | "photo_downloaded"
  // Courses and schedule
  | "course_viewed"
  | "course_signup_opened"
  | "course_signup_abandoned"
  | "course_signup_completed"
  | "schedule_viewed"
  // Store — defined so wiring them later is a one-line change. The shop is a
  // placeholder screen today, so nothing emits these yet.
  | "store_item_viewed"
  | "store_cart_add"
  | "store_checkout_started"
  | "store_checkout_completed"
  // Notifications and onboarding
  | "notification_opened"
  | "invite_code_entered"
  | "onboarding_step_completed"
  // Errors
  | "client_error";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

/** The photo boundary, and identity, enforced before anything is queued. */
const FORBIDDEN_KEYS = new Set([
  "photoid",
  "photo_id",
  "photourl",
  "photo_url",
  "url",
  "childid",
  "child_id",
  "childname",
  "child_name",
  "studentid",
  "student_id",
  "studentname",
  "name",
  "email",
  "phone",
  "message",
  "text",
  "caption",
  "query",
  "search",
  "password",
  "token",
]);

const FLUSH_INTERVAL_MS = 15_000;
const MAX_BATCH = 50;
/** Past this the queue is dropped rather than grown — memory beats completeness. */
const MAX_QUEUE = 500;

type QueuedEvent = {
  name: EventName;
  sessionId: string;
  anonId: string;
  platform: string;
  appVersion: string;
  locale: string;
  isLoggedIn: boolean;
  props?: EventProps;
};

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** New per app launch, so a session is one continuous use of the app. */
let sessionId = randomId();
/** Stable for the life of the install; lets a pre-login funnel be followed. */
const anonId = randomId();
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let openedAt = Date.now();
/** Last route seen, so an error can name its screen without a prop threaded
 *  through every component between the router and the boundary. */
let lastRoute: string | null = null;

function appVersion(): string {
  try {
    // expo-constants is already a dependency; expo-application would be a new
    // one, and the version in app.json is the number we actually ship.
    return Constants.expoConfig?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function sanitize(props?: EventProps): EventProps | undefined {
  if (!props) return undefined;
  const out: EventProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = typeof value === "string" ? value.slice(0, 120) : value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  try {
    await api.post("/api/analytics/events", { events: batch });
  } catch {
    // Dropped, not retried: a queue that grows while offline is a memory leak,
    // and a missing event costs nothing compared to a broken app.
  }
}

/** Records one event. Safe to call from anywhere, including a render path. */
export function track(name: EventName, props?: EventProps): void {
  try {
    if (name === "screen_view" && typeof props?.route === "string") {
      lastRoute = props.route;
    }
    if (queue.length >= MAX_QUEUE) return;
    queue.push({
      name,
      sessionId,
      anonId,
      platform: Platform.OS,
      appVersion: appVersion(),
      locale: useLocaleStore.getState().locale,
      isLoggedIn: !!useAuthStore.getState().token,
      props: sanitize(props),
    });
  } catch {
    // A failed track call must never propagate into the caller.
  }
}

/** The route currently on screen, for callers that cannot use a hook. */
export function currentScreen(): string {
  return lastRoute ?? "unknown";
}

/**
 * Starts the flush timer and the foreground/background session tracking.
 * Called once, from the root layout.
 */
export function startAnalytics(): () => void {
  try {
    openedAt = Date.now();
    track("app_open", { resumed: false });

    flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    const onChange = (state: AppStateStatus) => {
      try {
        if (state === "active") {
          // A resumed app is a new session: the gap could have been days.
          sessionId = randomId();
          openedAt = Date.now();
          track("app_open", { resumed: true });
        } else if (state === "background" || state === "inactive") {
          track("app_background", {
            seconds_since_open: Math.round((Date.now() - openedAt) / 1000),
          });
          // Last chance to send before the OS suspends us.
          void flush();
        }
      } catch {
        // Never let a lifecycle handler throw.
      }
    };

    const subscription = AppState.addEventListener("change", onChange);

    return () => {
      try {
        subscription.remove();
        if (flushTimer) clearInterval(flushTimer);
        flushTimer = null;
      } catch {
        // no-op
      }
    };
  } catch {
    return () => {};
  }
}
