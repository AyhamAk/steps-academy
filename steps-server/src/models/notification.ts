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
  tipId?: string;
  tipTitle?: string;
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
        tipId: input.tipId,
        tipTitle: input.tipTitle,
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

  /**
   * Unread counts for several users at once, for the badge number that rides
   * along with a push. One grouped query rather than one per recipient — a
   * whole-academy announcement fans out to every parent.
   *
   * Users with nothing unread are simply absent from the map, which is what
   * `groupBy` returns.
   */
  async unreadCountsFor(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    const rows = await prisma.notification.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, read: false },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.userId, row._count._all]));
  },

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },

  /**
   * Removes every notification for one account.
   *
   * Scoped to the caller by userId, never by id list — a notification is
   * personal, and a delete that took ids could be pointed at someone else's.
   */
  async clearAll(userId: string): Promise<number> {
    const { count } = await prisma.notification.deleteMany({ where: { userId } });
    return count;
  },
};
