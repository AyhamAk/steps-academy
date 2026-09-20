import rateLimit from "express-rate-limit";

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
