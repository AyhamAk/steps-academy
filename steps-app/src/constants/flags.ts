// Email/password auth works over plain REST and is the only way in today.
// Gallery requires a logged-in session, so this must stay on.
export const AUTH_ENABLED = true;

/**
 * "Continue with Google" is hidden until it can actually complete.
 *
 * Play re-signs the app with its own key, so the Android OAuth client needs
 * the Play App Signing SHA-1 — and that fingerprint only exists once the first
 * bundle has been uploaded. Until then the button fails for everyone who taps
 * it, which is worse than not offering it.
 *
 * Turning this on is not enough on its own: the Google path never sends an
 * invite code, so a first-time Google user is rejected with a 403. See the
 * re-enable checklist in the plan before flipping it.
 */
export const GOOGLE_SIGN_IN_ENABLED = false;
