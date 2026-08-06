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
