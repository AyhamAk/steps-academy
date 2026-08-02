import { Request, Response } from "express";

export function placeholder(_req: Request, res: Response) {
  res.status(501).json({ message: "shop endpoint not implemented yet" });
}
