import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { sendPushToUsers } from "../lib/push";
import { UserModel } from "../models/user";

/** A parent rates the app and optionally says why. */
export async function submitFeedback(req: Request, res: Response) {
  const { rating, message } = req.body as { rating?: unknown; message?: unknown };

  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return res.status(400).json({ message: "rating must be a whole number from 1 to 5" });
  }
  if (message !== undefined && message !== null && typeof message !== "string") {
    return res.status(400).json({ message: "message must be a string" });
  }
  const text = typeof message === "string" ? message.trim().slice(0, 1000) : null;

  const feedback = await prisma.feedback.create({
    data: { userId: req.userId!, rating: value, message: text || null },
    include: { user: { select: { name: true } } },
  });

  // Otherwise this sits in the table and nobody ever learns it arrived. Same
  // shape as the course-request alert; the note itself is deliberately left
  // out of the body, since it can run to 1000 characters.
  const admins = await UserModel.listAdmins();
  if (admins.length > 0) {
    await sendPushToUsers(admins, {
      title: "New feedback",
      body: `${feedback.user?.name ?? "A parent"} rated the app ${feedback.rating}/5.`,
      data: { type: "feedback" },
    });
  }

  res.status(201).json({ feedback: { id: feedback.id, rating: feedback.rating } });
}

/** Admin: everything currently unread becomes read. Clears the home alert. */
export async function markFeedbackRead(_req: Request, res: Response) {
  const { count } = await prisma.feedback.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ marked: count });
}

/** Admin: everything parents have said, newest first, with the average. */
export async function listFeedback(_req: Request, res: Response) {
  const [items, aggregate] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  res.json({
    feedback: items.map((item) => ({
      id: item.id,
      rating: item.rating,
      message: item.message,
      // Null when the account has since been deleted.
      from: item.user?.name ?? null,
      createdAt: item.createdAt,
    })),
    averageRating: aggregate._avg.rating,
    total: aggregate._count._all,
  });
}
