import { PhotoTag as PrismaPhotoTag } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type PhotoTag = PrismaPhotoTag;

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export const PhotoTagModel = {
  /** No-op if this photo already has a tag with the same (case-insensitive) name. */
  async create(photoId: string, studentName: string): Promise<PhotoTag | undefined> {
    const trimmed = studentName.trim();
    if (!trimmed) return undefined;

    const existing = (await this.listByPhoto(photoId)).find(
      (tag) => normalize(tag.studentName) === normalize(trimmed)
    );
    if (existing) return existing;

    return prisma.photoTag.create({ data: { photoId, studentName: trimmed } });
  },

  async remove(tagId: string): Promise<boolean> {
    try {
      await prisma.photoTag.delete({ where: { id: tagId } });
      return true;
    } catch {
      return false;
    }
  },

  async findById(id: string): Promise<PhotoTag | null> {
    return prisma.photoTag.findUnique({ where: { id } });
  },

  async listByPhoto(photoId: string): Promise<PhotoTag[]> {
    return prisma.photoTag.findMany({ where: { photoId } });
  },

  async listByPhotoIds(photoIds: string[]): Promise<PhotoTag[]> {
    return prisma.photoTag.findMany({ where: { photoId: { in: photoIds } } });
  },

  async listAll(): Promise<PhotoTag[]> {
    return prisma.photoTag.findMany();
  },

  async matchesAnyChild(photoId: string, childNames: string[]): Promise<boolean> {
    const normalizedChildren = childNames.map(normalize);
    const tags = await this.listByPhoto(photoId);
    return tags.some((tag) => normalizedChildren.includes(normalize(tag.studentName)));
  },

  /** Same match rule as matchesAnyChild, but against already-fetched tags — for batched lookups. */
  tagsMatchAnyChild(tags: PhotoTag[], childNames: string[]): boolean {
    const normalizedChildren = childNames.map(normalize);
    return tags.some((tag) => normalizedChildren.includes(normalize(tag.studentName)));
  },
};
