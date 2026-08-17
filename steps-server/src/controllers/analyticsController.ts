import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

/**
 * Ingest for first-party usage events. Nothing leaves this server.
 *
 * Three rules hold this endpoint together:
 *
 * 1. It never fails the caller. A malformed batch is dropped, not rejected —
 *    analytics must never be able to surface as an error in a parent's app.
 * 2. It never stores free text or identity. Props are flattened to primitives
 *    and a denylist strips anything that could carry a name, a photo, a child,
 *    or something a user typed.
 * 3. It works signed out. Events before sign-in carry an install id instead.
 */

const MAX_BATCH = 50;
const MAX_NAME = 64;
const MAX_PROPS = 20;
const MAX_STRING = 120;

/**
 * The photo boundary, enforced in code rather than by convention: an album is
 * allowed, an individual photo or a child is not. Analytics must never become
 * a record of which parent looked at which picture of which child.
 */
const FORBIDDEN_PROP_KEYS = new Set([
  "photoid",
  "photo_id",
  "photourl",
  "photo_url",
  "url",
  "childid",
  "child_id",
  "childname",
  "child_name",
  "studentid",
  "student_id",
  "studentname",
  "name",
  "email",
  "phone",
  "message",
  "text",
  "caption",
  "query",
  "search",
  "password",
  "token",
]);

type Incoming = {
  name?: unknown;
  sessionId?: unknown;
  anonId?: unknown;
  platform?: unknown;
  appVersion?: unknown;
  locale?: unknown;
  props?: unknown;
};

function clean(value: string, max = MAX_STRING): string {
  return value.slice(0, max);
}

/** Flat primitives only, with the denylist applied. Anything else is dropped. */
function sanitizeProps(input: unknown): Record<string, string | number | boolean> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const out: Record<string, string | number | boolean> = {};
  let count = 0;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (count >= MAX_PROPS) break;
    if (FORBIDDEN_PROP_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") out[clean(key, 40)] = clean(value);
    else if (typeof value === "number" && Number.isFinite(value)) out[clean(key, 40)] = value;
    else if (typeof value === "boolean") out[clean(key, 40)] = value;
    else continue;
    count += 1;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function ingestEvents(req: Request, res: Response) {
  // Answer first, write after: the app is never waiting on analytics.
  res.status(202).json({ ok: true });

  try {
    const body = req.body as { events?: unknown };
    if (!Array.isArray(body?.events)) return;

    const role = req.userRole ?? null;
    const rows = body.events
      .slice(0, MAX_BATCH)
      .filter((item): item is Incoming => !!item && typeof item === "object")
      .filter((item) => typeof item.name === "string" && item.name.length > 0)
      .map((item) => ({
        name: clean(item.name as string, MAX_NAME),
        userId: req.userId ?? null,
        anonId: typeof item.anonId === "string" ? clean(item.anonId, 64) : null,
        role,
        sessionId: typeof item.sessionId === "string" ? clean(item.sessionId, 64) : null,
        platform: typeof item.platform === "string" ? clean(item.platform, 16) : null,
        appVersion: typeof item.appVersion === "string" ? clean(item.appVersion, 24) : null,
        locale: typeof item.locale === "string" ? clean(item.locale, 8) : null,
        isLoggedIn: !!req.userId,
        props: sanitizeProps(item.props) ?? undefined,
      }));

    if (rows.length === 0) return;
    await prisma.analyticsEvent.createMany({ data: rows });
  } catch {
    // Swallowed on purpose. A failed write must never become a client error.
  }
}
