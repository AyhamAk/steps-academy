import { NextFunction, Request, Response } from "express";

import { Role, UserModel } from "../models/user";
import { verifyToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const { userId } = verifyToken(token);
    // The token can be validly signed yet reference a user who no longer exists —
    // e.g. the account was deleted. Treat that as an expired session (401) so the
    // client's 401 interceptor logs out and returns to the auth screen, instead
    // of routes returning a confusing 404.
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }
    req.userId = userId;
    // Cached here so downstream handlers (and adminOnly) don't re-query.
    req.userRole = user.role;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const { userId } = verifyToken(token);
      req.userId = userId;
    } catch {
      // no-op: proceed unauthenticated
    }
  }
  next();
}
