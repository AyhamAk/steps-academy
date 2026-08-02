// Google sign-in needs a custom dev client (not available in Expo Go), but
// email/password auth works fine over plain REST calls in Expo Go. Gallery
// requires a logged-in session, so this must stay on for testing it — just
// use the "Sign in" / "Create an account" email flow and skip the Google button.
export const AUTH_ENABLED = true;
