import { Router } from "express";

import { env } from "../config/env";

/**
 * The two public web pages both app stores require before a listing can go
 * live: a privacy policy URL, and a URL where account deletion can be requested
 * without installing the app (Google Play requires this second one explicitly).
 *
 * Served from the API rather than a separate site so there is one domain to
 * keep alive, and so the pages can never drift out of sync with the app that
 * is deployed. No auth, no data access — static copy only.
 *
 * DRAFT: this text describes what the code actually does today. It has not been
 * reviewed by anyone qualified in Israeli privacy law or COPPA, and it must be
 * before the app is submitted.
 */

const router = Router();

const ACADEMY_EMAIL = env.academyEmail;
const UPDATED = "16 August 2026";

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Steps Academy</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 32px 20px 64px; max-width: 720px;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #2C2416; background: #FFFDF8;
  }
  h1 { font-size: 28px; line-height: 1.25; margin: 0 0 4px; color: #E07A3A; }
  h2 { font-size: 19px; margin: 32px 0 8px; }
  .updated { color: #8C7B65; font-size: 14px; margin: 0 0 28px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  a { color: #E07A3A; }
  .box {
    background: #F5EFE4; border: 1px solid #E5DCC8; border-radius: 12px;
    padding: 16px 18px; margin: 24px 0;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

router.get("/privacy", (_req, res) => {
  res.type("html").send(
    page(
      "Privacy Policy",
      `<h1>Privacy Policy</h1>
<p class="updated">Steps Academy · Last updated ${UPDATED}</p>

<p>Steps Academy runs this app so that parents and guardians can see photographs
of their own child, follow the weekly timetable, and stay in contact with the
academy. This policy explains what we hold and why.</p>

<h2>Who this is for</h2>
<p>Accounts belong to <strong>parents and guardians</strong>, not to children.
Children do not sign up and do not log in. A guardian creates an account using
an invite code issued by the academy for their specific child.</p>

<h2>What we hold about your child</h2>
<ul>
  <li>Their first name, as the academy records it on its roster</li>
  <li>Photographs taken at academy events, and which children appear in them</li>
  <li>Which courses they attend</li>
  <li>Optionally, a date of birth and notes kept by the academy</li>
</ul>

<h2>What we hold about you</h2>
<ul>
  <li>Your name and email address</li>
  <li>Your password, stored only as a cryptographic hash that cannot be reversed</li>
  <li>A guardian phone number, when the academy records one to send your invite code</li>
  <li>A device token, if you allow notifications, so we can send them</li>
  <li>Any feedback or requests you send us through the app</li>
</ul>

<h2>Who can see a photograph</h2>
<p>A photograph is visible only to the guardians of a child who has been tagged
in it. Being present at the same event is not enough. Guardians are linked to
children by the academy — never by claiming a name in the app — so one family
cannot reach another family's photographs.</p>

<h2>What we never do</h2>
<ul>
  <li>We do not sell or rent any personal information</li>
  <li>We do not show advertising, and we do not use advertising trackers</li>
  <li>We do not profile children or build marketing audiences</li>
  <li>We do not share photographs with anyone outside the academy and the child's own guardians</li>
</ul>

<h2>Where it is kept</h2>
<p>Account and roster data is stored in a managed PostgreSQL database hosted in
the European Union. Photographs are stored in private object storage and are
only ever served through short-lived links generated for a signed-in guardian.
Both are operated by established infrastructure providers on our behalf.</p>

<h2>How long we keep it</h2>
<p>We keep your account until you delete it. Photographs are kept by the academy
as part of its record of an event, and are removed when the academy deletes the
photograph or the album.</p>

<h2>Your choices</h2>
<ul>
  <li><strong>Delete your account</strong> at any time from Profile in the app,
      or by using our <a href="/account-deletion">account deletion page</a>.</li>
  <li><strong>Ask what we hold</strong> about you or your child, and ask us to
      correct it.</li>
  <li><strong>Ask us to remove a photograph</strong> of your child. Email us and
      we will take it down.</li>
  <li><strong>Turn off notifications</strong> in your device settings.</li>
</ul>

<h2>Children's privacy</h2>
<p>The app is designed for guardians. We collect information about a child only
because their guardian and the academy have asked us to, and only for the
purposes above. A guardian confirms consent when creating their account. If you
believe we hold information about a child without the consent of their guardian,
contact us and we will delete it.</p>

<h2>Contact</h2>
<div class="box">
  <p>Questions, corrections, or requests about your data:<br>
  <a href="mailto:${ACADEMY_EMAIL}">${ACADEMY_EMAIL}</a></p>
</div>`
    )
  );
});

router.get("/account-deletion", (_req, res) => {
  res.type("html").send(
    page(
      "Delete your account",
      `<h1>Delete your account</h1>
<p class="updated">Steps Academy · Last updated ${UPDATED}</p>

<h2>From the app, immediately</h2>
<p>Open <strong>Profile</strong>, scroll to <strong>Delete account</strong>, and
confirm. Your account is deleted straight away — there is no waiting period and
no review.</p>

<h2>Without the app</h2>
<p>Email <a href="mailto:${ACADEMY_EMAIL}">${ACADEMY_EMAIL}</a> from the address
your account uses, asking us to delete it. We will confirm once it is done.</p>

<h2>What is deleted</h2>
<ul>
  <li>Your account, name, email address and password</li>
  <li>The link between you and your child</li>
  <li>Your notifications and your device's notification token</li>
  <li>Your invite code redemption record</li>
</ul>

<h2>What is not deleted</h2>
<p>Your child stays on the academy's roster, and photographs of them remain part
of the academy's record of its events. These belong to the academy rather than
to a single guardian, and a second guardian may still be using the app to see
them. Feedback you sent is kept without your name attached.</p>

<div class="box">
  <p>To have a photograph of your child removed as well, email
  <a href="mailto:${ACADEMY_EMAIL}">${ACADEMY_EMAIL}</a> and we will take it
  down.</p>
</div>`
    )
  );
});

export default router;
