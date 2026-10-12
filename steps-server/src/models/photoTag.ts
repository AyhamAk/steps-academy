import { PhotoTag as PrismaPhotoTag, Student } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type PhotoTag = PrismaPhotoTag;
export type PhotoTagWithStudent = PhotoTag & { student: Student };

export const PhotoTagModel = {
  /** No-op if this student is already tagged in this photo. */
  async create(photoId: string, studentId: string): Promise<PhotoTag> {
    return prisma.photoTag.upsert({
      where: { photoId_studentId: { photoId, studentId } },
      create: { photoId, studentId },
      update: {},
    });
  },

  /**
   * Keeps an album's photos in step with its children list. The list tags
   * photos as they are uploaded, so changing it afterwards has to reach the
   * photos already there — otherwise a child added later is in no photo, and
   * their family sees nothing. A child taken off loses their tags in this
   * album, the privacy-safe direction.
   */
  async syncAlbumChildren(eventId: string, added: string[], removed: string[]): Promise<void> {
    if (added.length > 0) {
      const photos = await prisma.photo.findMany({ where: { eventId }, select: { id: true } });
      await prisma.photoTag.createMany({
        data: photos.flatMap((photo) => added.map((studentId) => ({ photoId: photo.id, studentId }))),
        skipDuplicates: true,
      });
    }
    if (removed.length > 0) {
      await prisma.photoTag.deleteMany({ where: { photo: { eventId }, studentId: { in: removed } } });
    }
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

  async listByPhoto(photoId: string): Promise<PhotoTagWithStudent[]> {
    return prisma.photoTag.findMany({ where: { photoId }, include: { student: true } });
  },

  async listByPhotoIds(photoIds: string[]): Promise<PhotoTagWithStudent[]> {
    if (photoIds.length === 0) return [];
    return prisma.photoTag.findMany({
      where: { photoId: { in: photoIds } },
      include: { student: true },
    });
  },

  /**
   * Photo ids, among those given, tagged with at least one of these students.
   * Replaces the old case-insensitive name comparison: visibility is now a
   * foreign-key match, so two children sharing a name can never collide.
   */
  async photoIdsForStudents(photoIds: string[], studentIds: string[]): Promise<Set<string>> {
    if (photoIds.length === 0 || studentIds.length === 0) return new Set();
    const rows = await prisma.photoTag.findMany({
      where: { photoId: { in: photoIds }, studentId: { in: studentIds } },
      select: { photoId: true },
      distinct: ["photoId"],
    });
    return new Set(rows.map((row) => row.photoId));
  },

  tagsMatchAnyStudent(tags: PhotoTag[], studentIds: string[]): boolean {
    return tags.some((tag) => studentIds.includes(tag.studentId));
  },
};
