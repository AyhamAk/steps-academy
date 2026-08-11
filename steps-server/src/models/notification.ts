import { Notification as PrismaNotification, NotificationType } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type { NotificationType };
export type Notification = PrismaNotification;

type CreateInput = {
  userId: string;
  type: NotificationType;
  childName?: string;
  eventName?: string;
  eventId?: string;
  courseId?: string;
  courseName?: string;
};

export const NotificationModel = {
  async create(input: CreateInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        childName: input.childName,
        eventName: input.eventName,
        eventId: input.eventId,
        courseId: input.courseId,
        courseName: input.courseName,
      },
    });
  },

  /** Fan out one notification to many users (e.g. an announcement to all parents). */
  async createForUsers(userIds: string[], base: Omit<CreateInput, "userId">): Promise<void> {
    if (userIds.length === 0) return;
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...base, userId })),
    });
  },

  async listByUser(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  },

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  },

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },
};
