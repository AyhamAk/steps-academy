import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";

import { UserModel } from "../models/user";

/**
 * Gate for the private dashboard.
 *
 * HTTP Basic against the real admin accounts: a browser has nowhere to keep a
 * JWT, and a token in the query string would end up in logs and history. The
 * credentials are the same ones used to sign into the app, checked the same
 * way, and only `role: "admin"` gets through.
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

    next();
  } catch {
    deny();
  }
}
