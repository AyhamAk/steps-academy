import { env } from "../config/env";

/**
 * Sends and checks sign-in codes through Twilio Verify.
 *
 * Twilio owns the code itself — it generates it, expires it after ten
 * minutes, and locks a number out after too many wrong guesses — so no code
 * is ever stored here. We pay per successful check plus the SMS.
 *
 * One fixed number (REVIEW_PHONE / REVIEW_CODE) skips Twilio entirely, for
 * App Store and Play reviewers who cannot receive an SMS in Israel.
 */

type SendResult = { ok: true } | { ok: false; reason: "not_configured" | "rejected" };

function isReviewNumber(phone: string): boolean {
  return Boolean(env.reviewPhone && env.reviewCode && phone === env.reviewPhone);
}

function authHeader(): string {
  const { accountSid, authToken } = env.twilio;
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

function serviceUrl(path: string): string {
  return `https://verify.twilio.com/v2/Services/${env.twilio.verifyServiceSid}/${path}`;
}

export function isSmsConfigured(): boolean {
  const { accountSid, authToken, verifyServiceSid } = env.twilio;
  return Boolean(accountSid && authToken && verifyServiceSid);
}

/** Twilio writes the message in these languages; anything else falls back to English. */
const TWILIO_LOCALES = new Set(["en", "ar", "he"]);

export async function sendSignInCode(phone: string, locale?: string): Promise<SendResult> {
  if (isReviewNumber(phone)) return { ok: true };
  if (!isSmsConfigured()) return { ok: false, reason: "not_configured" };

  const body = new URLSearchParams({ To: phone, Channel: "sms" });
  if (locale && TWILIO_LOCALES.has(locale)) body.set("Locale", locale);

  const response = await fetch(serviceUrl("Verifications"), {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    // Logged without the number: Twilio's error code is what explains it.
    const detail = await response.json().catch(() => ({}));
    console.warn("[sms] send failed", response.status, (detail as { code?: number }).code);
    return { ok: false, reason: "rejected" };
  }
  return { ok: true };
}

/** True only when Twilio says this exact code is the live one for this number. */
export async function checkSignInCode(phone: string, code: string): Promise<boolean> {
  if (isReviewNumber(phone)) return code === env.reviewCode;
  if (!isSmsConfigured()) return false;

  const response = await fetch(serviceUrl("VerificationCheck"), {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: phone, Code: code }),
  });
  // 404 means no pending code for this number (expired or already used).
  if (!response.ok) return false;
  const result = (await response.json()) as { status?: string };
  return result.status === "approved";
}
