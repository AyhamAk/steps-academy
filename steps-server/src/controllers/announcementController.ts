import { Request, Response } from "express";

import { AnnouncementModel } from "../models/announcement";

export function createAnnouncement(req: Request, res: Response) {
  const { text } = req.body as { text?: string };

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "text is required" });
  }

  const announcement = AnnouncementModel.create({ text: text.trim(), createdBy: req.userId! });
  res.status(201).json({ announcement });
}

export function getLatestAnnouncement(_req: Request, res: Response) {
  const announcement = AnnouncementModel.findLatest();
  res.json({ announcement: announcement ?? null });
}
