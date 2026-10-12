import { Photo as PrismaPhoto } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { DEFAULT_PAGE_SIZE } from "./event";

export type Photo = PrismaPhoto;

/**
 * "photo" unless a caller asks for "all". App versions from before videos
 * existed never ask, so they keep receiving exactly the stills they can show.
 */
export type MediaFilter = "photo" | "all";

function mediaWhere(media: MediaFilter) {
  return media === "all" ? {} : { mediaType: "photo" as const };
}

type CreateVideoInput = {
  eventId: string;
  filename: string;
  uploadedBy: string;
  videoKey: string;
  posterKey: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
};

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

  /** A video row: the file in `key`, its poster in thumbKey and mediumKey. */
  async createVideo(input: CreateVideoInput): Promise<Photo> {
    return prisma.photo.create({
      data: {
        eventId: input.eventId,
        filename: input.filename,
        mediaType: "video",
        key: input.videoKey,
        thumbKey: input.posterKey,
        mediumKey: input.posterKey,
        durationSec: input.durationSec,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedBy: input.uploadedBy,
      },
    });
  },

  /** How many photos and videos of these children an album holds. */
  async countForStudentsInEvent(eventId: string, studentIds: string[]) {
    if (studentIds.length === 0) return { all: 0, photo: 0, video: 0 };
    const rows = await prisma.photo.groupBy({
      by: ["mediaType"],
      where: { eventId, tags: { some: { studentId: { in: studentIds } } } },
      _count: { _all: true },
    });
    const photo = rows.find((row) => row.mediaType === "photo")?._count._all ?? 0;
    const video = rows.find((row) => row.mediaType === "video")?._count._all ?? 0;
    return { all: photo + video, photo, video };
  },

  async findById(id: string): Promise<Photo | null> {
    return prisma.photo.findUnique({ where: { id } });
  },

  async listByEvent(
    eventId: string,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    media: MediaFilter = "photo",
  ): Promise<Photo[]> {
    return prisma.photo.findMany({
      where: { eventId, ...mediaWhere(media) },
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
      // Photos only: the feeds this serves (Home, gallery list) show stills.
      where: { mediaType: "photo", tags: { some: { studentId: { in: studentIds } } } },
      include: {
        event: true,
        tags: { include: { student: { select: { id: true, name: true } } } },
      },
      orderBy: [{ event: { date: "desc" } }, { uploadedAt: "asc" }],
      take: limit,
      skip: offset,
    });
  },

  /**
   * The children tagged in photos added to an event since a given moment.
   *
   * Drives the second and later rounds of album notifications: an admin who
   * reopens a published album and adds more photos should reach the families
   * of the children in *those* photos, not everyone who was at the event.
   */
  async studentIdsTaggedSince(eventId: string, since?: Date): Promise<string[]> {
    // By when the tag was made, not when the photo was: a child added to an
    // album after its photos were uploaded is tagged on old photos, and their
    // family is just as new to the album as one whose child is in a new photo.
    const rows = await prisma.photoTag.findMany({
      where: { photo: { eventId }, ...(since ? { createdAt: { gt: since } } : {}) },
      select: { studentId: true },
      distinct: ["studentId"],
    });
    return rows.map((row) => row.studentId);
  },


  /** As above, scoped to one event. */
  async listForStudentsInEvent(
    eventId: string,
    studentIds: string[],
    limit: number,
    offset = 0,
    media: MediaFilter = "photo",
  ) {
    if (studentIds.length === 0) return [];
    return prisma.photo.findMany({
      where: { eventId, ...mediaWhere(media), tags: { some: { studentId: { in: studentIds } } } },
      include: { tags: { include: { student: { select: { id: true, name: true } } } } },
      orderBy: { uploadedAt: "asc" },
      take: limit,
      skip: offset,
    });
  },
};
