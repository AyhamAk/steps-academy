import { randomUUID } from "crypto";

import { NotificationModel } from "../models/notification";
import { prisma } from "./prisma";
import { User } from "../models/user";
import { PushLocale, toPushLocale } from "./pushCopy";

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
export async function sendPushToUsers(
  users: User[],
  /**
   * Either one payload for everyone, or a builder called per recipient — the
   * body is rendered by the OS, so a parent reading the app in Arabic has to
   * be sent Arabic rather than translating it on arrival.
   */
  payload: PushPayload | ((locale: PushLocale) => PushPayload)
): Promise<void> {
  const contentFor = (user: User) =>
    typeof payload === "function" ? payload(toPushLocale(user.locale)) : payload;

  const recipients = users.filter(
    (user): user is User & { pushToken: string } =>
      !!user.pushToken && EXPO_TOKEN_PATTERN.test(user.pushToken)
  );

  // Phones with notifications off are logged too, so the dashboard can say
  // "never reached them" instead of silently leaving them out.
  const unreachable = users.filter((user) => !recipients.includes(user as User & { pushToken: string }));
  if (unreachable.length > 0) {
    await logDeliveries(
      unreachable.map((user) => ({ id: randomUUID(), user, content: contentFor(user), status: "no_token" })),
    );
  }

  if (recipients.length === 0) return;

  // iPhone shows this number on the app icon and leaves it there until
  // something changes it, so sending a flat 1 told a parent with five unread
  // notifications that they had one. Android ignores it — the launcher draws
  // its own count from the channel.
  //
  // Guarded like everything else here: a failed count must not cost the
  // notification itself.
  let unread = new Map<string, number>();
  try {
    unread = await NotificationModel.unreadCountsFor(recipients.map((user) => user.id));
  } catch (err) {
    console.error("Push notification badge counts failed:", err);
  }

  const sends = recipients.map((user) => ({ id: randomUUID(), user, content: contentFor(user), status: "sent" }));
  await logDeliveries(sends);

  const messages = sends.map(({ id, user, content }) => {
    return {
      to: user.pushToken,
      sound: "default",
      title: content.title,
      body: content.body,
      // pushId lets the app report which push was tapped.
      data: { ...(content.data ?? {}), pushId: id },
      // Without channelId, a notification delivered while the app is closed
      // lands on Android's fallback channel — no banner, no sound. The app
      // creates this channel at MAX importance on first launch.
      channelId: "default",
      // High priority is what wakes the device to display it; the default
      // ("normal") lets Android hold it until the next maintenance window.
      priority: "high",
      badge: unread.get(user.id) ?? 1,
    };
  });

  const ids = sends.map((send) => send.id);
  for (const [index, batch] of chunk(messages, CHUNK_SIZE).entries()) {
    const batchIds = ids.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
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
        const text = await res.text();
        console.error("Push notification batch failed:", res.status, text);
        await markFailed(batchIds, `send_failed_${res.status}`);
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      await saveTickets(batchIds, json.data ?? []);
    } catch (err) {
      console.error("Push notification batch failed:", err);
      await markFailed(batchIds, "send_failed");
    }
  }
}

type ExpoTicket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

type DeliveryLog = { id: string; user: User; content: PushPayload; status: string };

// Logging is best-effort like the push itself: a failed write here must never
// cost a family their notification.
async function logDeliveries(rows: DeliveryLog[]): Promise<void> {
  try {
    await prisma.pushDelivery.createMany({
      data: rows.map(({ id, user, content, status }) => ({
        id,
        userId: user.id,
        kind: content.data?.type ?? "other",
        refId: content.data?.eventId ?? content.data?.courseId ?? content.data?.tipId ?? null,
        title: content.title.slice(0, 200),
        body: content.body.slice(0, 500),
        status,
      })),
    });
  } catch (err) {
    console.error("Push delivery log failed:", err);
  }
}

async function markFailed(ids: string[], error: string): Promise<void> {
  try {
    await prisma.pushDelivery.updateMany({ where: { id: { in: ids } }, data: { status: "failed", error } });
  } catch (err) {
    console.error("Push delivery log failed:", err);
  }
}

/** Expo answers in the same order the messages were sent. */
async function saveTickets(ids: string[], tickets: ExpoTicket[]): Promise<void> {
  try {
    await prisma.$transaction(
      ids.map((id, i) => {
        const ticket = tickets[i];
        if (ticket?.status === "ok") {
          return prisma.pushDelivery.update({ where: { id }, data: { ticketId: ticket.id } });
        }
        return prisma.pushDelivery.update({
          where: { id },
          data: {
            status: "failed",
            checkedAt: new Date(),
            error: ticket ? (ticket.details?.error ?? ticket.message ?? "error").slice(0, 200) : "no_ticket",
          },
        });
      }),
    );
  } catch (err) {
    console.error("Push delivery log failed:", err);
  }
}
