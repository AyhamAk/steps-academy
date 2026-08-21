import { Request, Response } from "express";

import { AnnouncementModel } from "../models/announcement";
import { NotificationModel } from "../models/notification";
import { UserModel } from "../models/user";
import { sendPushToUsers } from "../lib/push";
import { announcementPosted } from "../lib/pushCopy";

export async function createAnnouncement(req: Request, res: Response) {
  const { text } = req.body as { text?: string };

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "text is required" });
  }
  if (text.trim().length > 2000) {
    return res.status(400).json({ message: "text must be 2000 characters or fewer" });
  }

  const announcement = await AnnouncementModel.create({
    text: text.trim(),
    createdBy: req.userId!,
  });

  // Notify every parent about the new announcement.
  const parents = await UserModel.listParents();
  await NotificationModel.createForUsers(parents.map((parent) => parent.id), {
    type: "announcement",
  });
  await sendPushToUsers(parents, (locale) => announcementPosted(announcement.text, locale));

  res.status(201).json({ announcement });
}

export async function getLatestAnnouncement(_req: Request, res: Response) {
  const announcement = await AnnouncementModel.findLatest();
  res.json({ announcement: announcement ?? null });
}
