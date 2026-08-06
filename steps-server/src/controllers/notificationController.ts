import { Request, Response } from "express";

import { NotificationModel } from "../models/notification";

async function serialize(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.listByUser(userId),
    NotificationModel.unreadCount(userId),
  ]);
  return { notifications, unreadCount };
}

export async function listNotifications(req: Request, res: Response) {
  res.json(await serialize(req.userId!));
}

export async function markAllRead(req: Request, res: Response) {
  await NotificationModel.markAllRead(req.userId!);
  res.json(await serialize(req.userId!));
}
