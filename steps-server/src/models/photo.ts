import { Photo as PrismaPhoto } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { DEFAULT_PAGE_SIZE } from "./event";

export type Photo = PrismaPhoto;

type CreatePhotoInput = {
  eventId: string;
  filename: string;
  uploadedBy: string;
  // Real uploads set these three (R2 object keys)...
  key?: string;
  thumbKey?: string;
  mediumKey?: string;
  // ...dev-seed placeholder photos set this instead, bypassing R2 entirely.
  externalUrl?: string;
};

export const PhotoModel = {
  async create(input: CreatePhotoInput): Promise<Photo> {
    return prisma.photo.create({
      data: {
        eventId: input.eventId,
        filename: input.filename,
        key: input.key ?? null,
        thumbKey: input.thumbKey ?? null,
        mediumKey: input.mediumKey ?? null,
        externalUrl: input.externalUrl ?? null,
        uploadedBy: input.uploadedBy,
      },
    });
  },

  async findById(id: string): Promise<Photo | null> {
    return prisma.photo.findUnique({ where: { id } });
  },

  async listByEvent(eventId: string, limit = DEFAULT_PAGE_SIZE, offset = 0): Promise<Photo[]> {
    return prisma.photo.findMany({
      where: { eventId },
      orderBy: { uploadedAt: "asc" },
      take: limit,
      skip: offset,
    });
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.photo.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async countByEvent(eventId: string): Promise<number> {
    return prisma.photo.count({ where: { eventId } });
  },

  /**
   * Every photo visible to a set of students, with its event and tags, in one
   * query. The parent gallery used to walk every event and fetch up to 1000
   * photos each; this is a single indexed lookup instead.
   */
  async listForStudents(studentIds: string[], limit: number, offset = 0) {
    if (studentIds.length === 0) return [];
    return prisma.photo.findMany({
      where: { tags: { some: { studentId: { in: studentIds } } } },
      include: {
        event: true,
        tags: { include: { student: { select: { id: true, name: true } } } },
      },
      orderBy: [{ event: { date: "desc" } }, { uploadedAt: "asc" }],
      take: limit,
      skip: offset,
    });
  },

  /** As above, scoped to one event. */
  async listForStudentsInEvent(eventId: string, studentIds: string[], limit: number, offset = 0) {
    if (studentIds.length === 0) return [];
    return prisma.photo.findMany({
      where: { eventId, tags: { some: { studentId: { in: studentIds } } } },
      include: { tags: { include: { student: { select: { id: true, name: true } } } } },
      orderBy: { uploadedAt: "asc" },
      take: limit,
      skip: offset,
    });
  },
};
