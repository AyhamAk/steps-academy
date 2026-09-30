import { createHmac, randomInt, timingSafeEqual } from "crypto";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";

/**
 * Sign-in codes, delivered by WhatsApp through Meta's Cloud API.
 *
 * We make the code, keep only an HMAC of it, and check it ourselves:
 * - single use, ten minutes, five guesses;
 * - one send per number every 30 seconds, and at most five an hour — every
 *   send is a paid WhatsApp message, so this is also what caps the bill.
 *
 * One fixed number (REVIEW_PHONE / REVIEW_CODE) skips WhatsApp entirely, for
 * App Store and Play reviewers who cannot receive a message here.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_GUESSES = 5;
const RESEND_GAP_MS = 30 * 1000;
const MAX_SENDS_PER_HOUR = 5;

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rejected" | "too_soon" | "too_many" };

function isReviewNumber(phone: string): boolean {
  return Boolean(env.reviewPhone && env.reviewCode && phone === env.reviewPhone);
}

function hashCode(phone: string, code: string): string {
  return createHmac("sha256", `${env.jwtSecret}:phone-code`).update(`${phone}:${code}`).digest("hex");
}

export function isSmsConfigured(): boolean {
  return Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId);
}

/** Template languages the academy created; anything else falls back to Arabic. */
const TEMPLATE_LANGUAGES: Record<string, string> = { ar: "ar", he: "he", en: "en" };

async function sendWhatsAppCode(phone: string, code: string, language: string): Promise<boolean> {
  const { token, phoneNumberId, template, apiVersion } = env.whatsapp;
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      // Meta wants digits only: +972501234567 -> 972501234567
      to: phone.replace(/^\+/, ""),
      type: "template",
      template: {
        name: template,
        language: { code: language },
        // An authentication template carries the code twice: in the body, and
        // behind its "copy code" button.
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!response.ok) {
    // Logged without the number or the code: Meta's error code explains it.
    const detail = (await response.json().catch(() => ({}))) as {
      error?: { code?: number; message?: string };
    };
    console.warn("[whatsapp] send failed", response.status, detail.error?.code, detail.error?.message);
    return false;
  }
  return true;
}

export async function sendSignInCode(phone: string, locale?: string): Promise<SendResult> {
  if (isReviewNumber(phone)) return { ok: true };
  if (!isSmsConfigured()) return { ok: false, reason: "not_configured" };

  const now = Date.now();
  const recent = await prisma.phoneCode.findMany({
    where: { phone, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_GAP_MS) {
    return { ok: false, reason: "too_soon" };
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) return { ok: false, reason: "too_many" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const language = TEMPLATE_LANGUAGES[locale ?? ""] ?? "ar";
  // A template missing in this language fails; Arabic always exists.
  const sent =
    (await sendWhatsAppCode(phone, code, language)) ||
    (language !== "ar" && (await sendWhatsAppCode(phone, code, "ar")));
  if (!sent) return { ok: false, reason: "rejected" };

  // Only a sent code counts: a failed send must not burn the parent's hourly allowance.
  await prisma.phoneCode.create({
    data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + CODE_TTL_MS) },
  });
  return { ok: true };
}

/** True only for the latest live code sent to this number. Uses it up on success. */
export async function checkSignInCode(phone: string, code: string): Promise<boolean> {
  if (isReviewNumber(phone)) return code === env.reviewCode;

  const latest = await prisma.phoneCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!latest || latest.attempts >= MAX_GUESSES) return false;

  const expected = Buffer.from(latest.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await prisma.phoneCode.update({ where: { id: latest.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  // Conditional on still being unused, so two simultaneous checks can't both win.
  const { count } = await prisma.phoneCode.updateMany({
    where: { id: latest.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}
