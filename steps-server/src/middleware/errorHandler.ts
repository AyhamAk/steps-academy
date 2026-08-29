import { NextFunction, Request, Response } from "express";

import { captureError } from "../lib/sentry";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  captureError(err, req.userId);
  res.status(500).json({ message: "Internal server error" });
}
