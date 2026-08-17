import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";

/**
 * Records one row per API call, after the response has been sent.
 *
 * This is where most product questions are actually answered — sign-ups,
 * daily actives, which features get used, and every funnel step that reaches
 * the server — without a single line in the app. It cannot be stripped by a
 * stale build and cannot be blocked by the client.
 *
 * Deliberately narrow: the matched route *pattern*, the status and the
 * duration. Never a query string, never a body, never a URL parameter value —
 * those carry ids, search terms and, in this app, children.
 */

const SKIP_EXACT = new Set(["/health", "/privacy", "/account-deletion", "/favicon.ico"]);

export function requestTelemetry(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    try {
      // originalUrl, not path: once a request has been routed, req.path is
      // relative to the mounted router ("/events"), so matching on it silently
      // failed and the ingest endpoint logged itself on every flush.
      const fullPath = (req.originalUrl || req.url).split("?")[0];
      if (SKIP_EXACT.has(fullPath)) return;
      if (fullPath.startsWith("/api/analytics")) return;

      // The pattern, not the path: /api/gallery/events/:eventId, never the id.
      const pattern = `${req.baseUrl}${req.route?.path ?? ""}` || req.path;

      void prisma.analyticsEvent
        .create({
          data: {
            name: "api_request",
            userId: req.userId ?? null,
            role: req.userRole ?? null,
            isLoggedIn: !!req.userId,
            props: {
              method: req.method,
              route: pattern.slice(0, 120),
              status: res.statusCode,
              ms: Date.now() - startedAt,
            },
          },
        })
        .catch(() => {});
    } catch {
      // Never let telemetry surface in a request that already succeeded.
    }
  });

  next();
}
