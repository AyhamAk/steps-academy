import { Announcement as PrismaAnnouncement } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Announcement = PrismaAnnouncement;

type CreateAnnouncementInput = {
  text: string;
  createdBy: string;
};

export const AnnouncementModel = {
  async create(input: CreateAnnouncementInput): Promise<Announcement> {
    return prisma.announcement.create({
      data: { text: input.text, createdBy: input.createdBy },
    });
  },

  async findLatest(): Promise<Announcement | null> {
    return prisma.announcement.findFirst({ orderBy: { createdAt: "desc" } });
  },
};
