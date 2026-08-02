import { randomUUID } from "crypto";

export type Announcement = {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
};

const announcementsById = new Map<string, Announcement>();

type CreateAnnouncementInput = {
  text: string;
  createdBy: string;
};

export const AnnouncementModel = {
  create(input: CreateAnnouncementInput): Announcement {
    const announcement: Announcement = {
      id: randomUUID(),
      text: input.text,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    announcementsById.set(announcement.id, announcement);
    return announcement;
  },

  findLatest(): Announcement | undefined {
    return [...announcementsById.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    )[0];
  },
};
