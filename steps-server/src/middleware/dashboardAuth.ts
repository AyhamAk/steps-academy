import crypto from "crypto";

import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { UserModel } from "../models/user";

/**
 * Gate for the private dashboard.
 *
 * HTTP Basic against the real admin accounts: a browser has nowhere to keep a
 * JWT, and a token in the query string would end up in logs and history. The
 * credentials are the same ones used to sign into the app, checked the same
 * way, and only `role: "admin"` gets through.
 *
 * On success this sets `req.userId` / `req.userRole` — the same fields
 * `requireAuth` sets — so the panel's writes can record who made them.
 */
export async function dashboardAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";

  const deny = () => {
    res.set("WWW-Authenticate", 'Basic realm="Steps Academy", charset="UTF-8"');
    res.status(401).send("Authentication required");
  };

  if (!header.startsWith("Basic ")) return deny();

  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return deny();

    const email = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    const user = await UserModel.findByEmail(email);
    if (!user?.passwordHash || user.role !== "admin") return deny();
    if (!(await bcrypt.compare(password, user.passwordHash))) return deny();

    req.userId = user.id;
    req.userRole = user.role;
    res.locals.adminName = user.name ?? user.email;

    next();
  } catch {
    deny();
  }
}

/**
 * Per-admin CSRF token.
 *
 * Basic credentials are replayed by the browser on *any* request to this
 * origin, including a form another site posts here, so the panel's writes
 * would otherwise be forgeable. Deriving the token from the server's JWT
 * secret makes it unguessable without also being able to mint tokens, and
 * keeps it stateless — there is no session store to hang one off.
 */
export function csrfToken(userId: string): string {
  return crypto.createHmac("sha256", env.jwtSecret).update(`dashboard:${userId}`).digest("hex");
}

/**
 * Rejects a write that did not come from a panel page.
 *
 * Two independent checks, because each covers a gap in the other: the token
 * proves the form was rendered for this admin, and `Sec-Fetch-Site` catches a
 * cross-origin post in every browser that sends it.
 */
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "admin" || !req.userId) {
    return res.status(403).send("Admin access required");
  }

  const site = req.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return res.status(403).send("Cross-site request refused");
  }

  const sent = String((req.body as Record<string, unknown> | undefined)?._csrf ?? "");
  const expected = csrfToken(req.userId);
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).send("This form expired. Go back, reload the page and try again.");
  }

  next();
}
