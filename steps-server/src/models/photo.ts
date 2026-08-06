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

  async listAll(): Promise<Photo[]> {
    return prisma.photo.findMany();
  },
};
