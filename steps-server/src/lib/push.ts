import { User } from "../models/user";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Best-effort push fan-out — never throws. A push failure (bad token, Expo
 * outage, etc.) must not break the request that triggered it, since an
 * in-app Notification row has already been written by this point.
 */
export async function sendPushToUsers(users: User[], payload: PushPayload): Promise<void> {
  const tokens = users
    .map((user) => user.pushToken)
    .filter((token): token is string => !!token && EXPO_TOKEN_PATTERN.test(token));

  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    // Without channelId, a notification delivered while the app is closed
    // lands on Android's fallback channel — no banner, no sound. The app
    // creates this channel at MAX importance on first launch.
    channelId: "default",
    // High priority is what wakes the device to display it; the default
    // ("normal") lets Android hold it until the next maintenance window.
    priority: "high",
    badge: 1,
  }));

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const res = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error("Push notification batch failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Push notification batch failed:", err);
    }
  }
}
