import { env } from "../config/env";
import { prisma } from "../lib/prisma";

/**
 * Sign-in codes, delivered through Twilio Verify: by WhatsApp, or by SMS when
 * WhatsApp can't take it. Twilio makes the code, keeps it, and checks it —
 * single use, ten minutes, five guesses.
 *
 * We still log each send, to allow one per number every 30 seconds and at most
 * five an hour — every send is paid, so this is also what caps the bill.
 *
 * One fixed number (REVIEW_PHONE / REVIEW_CODE) skips Twilio entirely, for
 * App Store and Play reviewers who cannot receive a message here. A second
 * one (REVIEW_ADMIN_PHONE) does the same for the manager account.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_GAP_MS = 30 * 1000;
const MAX_SENDS_PER_HOUR = 5;

/** Twilio's "max send attempts reached" for a number. */
const TWILIO_TOO_MANY_SENDS = 60203;

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rejected" | "too_soon" | "too_many" };

function isReviewNumber(phone: string): boolean {
  if (!env.reviewCode) return false;
  return (
    Boolean(env.reviewPhone && phone === env.reviewPhone) ||
    Boolean(env.reviewAdminPhone && phone === env.reviewAdminPhone)
  );
}

export function isSmsConfigured(): boolean {
  const { accountSid, authToken, verifyServiceSid } = env.twilio;
  return Boolean(accountSid && authToken && verifyServiceSid);
}

/** Message languages we ask Twilio for; anything else falls back to Arabic. */
const VERIFY_LOCALES: Record<string, string> = { ar: "ar", he: "he", en: "en" };

type TwilioReply = { ok: boolean; status: number; body: { status?: string; code?: number; message?: string } };

async function callVerify(path: string, params: Record<string, string>): Promise<TwilioReply> {
  const { accountSid, authToken, verifyServiceSid } = env.twilio;
  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await response.json().catch(() => ({}))) as TwilioReply["body"];
  return { ok: response.ok, status: response.status, body };
}

async function sendVerification(phone: string, channel: "whatsapp" | "sms", locale: string) {
  const reply = await callVerify("Verifications", { To: phone, Channel: channel, Locale: locale });
  if (!reply.ok) {
    // Logged without the number: Twilio's error code explains it.
    console.warn(`[twilio] ${channel} send failed`, reply.status, reply.body.code, reply.body.message);
  }
  return reply;
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

  const language = VERIFY_LOCALES[locale ?? ""] ?? "ar";
  let reply = await sendVerification(phone, "whatsapp", language);
  if (!reply.ok && reply.body.code === TWILIO_TOO_MANY_SENDS) return { ok: false, reason: "too_many" };
  // A number without WhatsApp, or WhatsApp refused it: try a plain SMS.
  if (!reply.ok) reply = await sendVerification(phone, "sms", language);
  if (!reply.ok) {
    return { ok: false, reason: reply.body.code === TWILIO_TOO_MANY_SENDS ? "too_many" : "rejected" };
  }

  // Only a sent code counts: a failed send must not burn the parent's hourly
  // allowance. Twilio holds the code itself, so there is no hash to keep.
  await prisma.phoneCode.create({
    data: { phone, codeHash: "", expiresAt: new Date(now + CODE_TTL_MS) },
  });
  return { ok: true };
}

/** True only for the live code Twilio sent this number. Twilio uses it up on success. */
export async function checkSignInCode(phone: string, code: string): Promise<boolean> {
  if (isReviewNumber(phone)) return code === env.reviewCode;
  if (!isSmsConfigured()) return false;

  // Expired, used, or out of guesses all come back as an error, not "approved".
  const reply = await callVerify("VerificationCheck", { To: phone, Code: code });
  return reply.ok && reply.body.status === "approved";
}
