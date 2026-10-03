import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { toE164 } from "../utils/phone";

// Brute-force / credential-stuffing protection on login & registration.
// Keyed by IP; 20 attempts per 15 minutes is generous for a real user,
// punishing for a script trying passwords.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

// Phone sign-in can't share authRateLimit's 20 per IP: parents signing in
// together on the academy's Wi-Fi, or behind a mobile carrier's shared address,
// all count as one IP, and one sign-in takes two or three requests. So each
// number gets its own budget, and the IP cap only stops a script sweeping
// through numbers (every /phone/start is a paid SMS).
export const phoneNumberRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => toE164(req.body?.phone) ?? ipKeyGenerator(req.ip ?? ""),
  message: { message: "Too many attempts. Please try again later." },
});

export const phoneIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

// Generous by design: a busy family sends a batch every 15 seconds, and the
// cost of dropping real events is higher than the cost of a few extra rows.
export const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  // Silence rather than an error body: the client ignores the response anyway.
  handler: (_req, res) => res.status(202).json({ ok: true }),
});

// The admin panel's Basic auth is checked with bcrypt, which is slow enough to
// discourage guessing but is the only brake there was. Same budget as login:
// an admin signs in once and the browser replays the header from then on, so
// 20 in a quarter of an hour only ever bites a script.
export const dashboardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Only failures count — the browser re-sends credentials on every page load,
  // and a working session must not be able to lock itself out.
  skipSuccessfulRequests: true,
  message: "Too many attempts. Please try again later.",
});
