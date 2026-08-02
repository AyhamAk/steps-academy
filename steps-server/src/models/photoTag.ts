import { randomUUID } from "crypto";

export type PhotoTag = {
  id: string;
  photoId: string;
  studentName: string;
  createdAt: string;
};

const tagsById = new Map<string, PhotoTag>();

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export const PhotoTagModel = {
  /** No-op if this photo already has a tag with the same (case-insensitive) name. */
  create(photoId: string, studentName: string): PhotoTag | undefined {
    const trimmed = studentName.trim();
    if (!trimmed) return undefined;

    const existing = this.listByPhoto(photoId).find(
      (tag) => normalize(tag.studentName) === normalize(trimmed)
    );
    if (existing) return existing;

    const tag: PhotoTag = {
      id: randomUUID(),
      photoId,
      studentName: trimmed,
      createdAt: new Date().toISOString(),
    };
    tagsById.set(tag.id, tag);
    return tag;
  },

  remove(tagId: string): boolean {
    return tagsById.delete(tagId);
  },

  findById(id: string): PhotoTag | undefined {
    return tagsById.get(id);
  },

  listByPhoto(photoId: string): PhotoTag[] {
    return [...tagsById.values()].filter((tag) => tag.photoId === photoId);
  },

  listByPhotoIds(photoIds: string[]): PhotoTag[] {
    const idSet = new Set(photoIds);
    return [...tagsById.values()].filter((tag) => idSet.has(tag.photoId));
  },

  listAll(): PhotoTag[] {
    return [...tagsById.values()];
  },

  matchesAnyChild(photoId: string, childNames: string[]): boolean {
    const normalizedChildren = childNames.map(normalize);
    return this.listByPhoto(photoId).some((tag) =>
      normalizedChildren.includes(normalize(tag.studentName))
    );
  },
};
