import { prisma } from "./prisma";

/**
 * Asks Expo what Apple/Google said about each push we sent.
 *
 * Sending only gets a ticket ("Expo accepted it"). Whether it actually
 * reached the phone is known a few minutes later, as a receipt. Expo keeps
 * receipts for about a day, so anything older is left as "sent" (unknown).
 */

const RECEIPTS_API = "https://exp.host/--/api/v2/push/getReceipts";
const CHECK_MS = 15 * 60 * 1000;
/** Receipts are not ready straight away. */
const WAIT_MS = 10 * 60 * 1000;
const GIVE_UP_MS = 24 * 60 * 60 * 1000;
/** Expo accepts up to 1000 ids per request. */
const BATCH = 1000;

type Receipt = { status: "ok" } | { status: "error"; message?: string; details?: { error?: string } };

export async function checkPushReceipts(now = new Date()): Promise<void> {
  try {
    const pending = await prisma.pushDelivery.findMany({
      where: {
        status: "sent",
        ticketId: { not: null },
        createdAt: { lt: new Date(now.getTime() - WAIT_MS), gt: new Date(now.getTime() - GIVE_UP_MS) },
      },
      select: { id: true, ticketId: true },
      take: BATCH,
    });
    if (pending.length === 0) return;

    const res = await fetch(RECEIPTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ids: pending.map((row) => row.ticketId) }),
    });
    if (!res.ok) {
      console.error("[push] receipts failed:", res.status, await res.text());
      return;
    }
    const receipts = ((await res.json()) as { data?: Record<string, Receipt> }).data ?? {};

    const checkedAt = new Date();
    const updates = pending.flatMap((row) => {
      const receipt = receipts[row.ticketId as string];
      if (!receipt) return [];
      return [
        prisma.pushDelivery.update({
          where: { id: row.id },
          data:
            receipt.status === "ok"
              ? { status: "delivered", checkedAt }
              : {
                  status: "failed",
                  checkedAt,
                  error: (receipt.details?.error ?? receipt.message ?? "error").slice(0, 200),
                },
        }),
      ];
    });
    if (updates.length > 0) await prisma.$transaction(updates);
  } catch (error) {
    // A failed check must never take the API down; the next one retries.
    console.error("[push] receipts failed:", error);
  }
}

export function schedulePushReceipts(): void {
  void checkPushReceipts();
  const timer = setInterval(() => void checkPushReceipts(), CHECK_MS);
  timer.unref?.();
}
