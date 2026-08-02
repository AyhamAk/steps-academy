import { randomUUID } from "crypto";

export type Photo = {
  id: string;
  eventId: string;
  filename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
};

const photosById = new Map<string, Photo>();

type CreatePhotoInput = {
  eventId: string;
  filename: string;
  url: string;
  uploadedBy: string;
};

export const PhotoModel = {
  create(input: CreatePhotoInput): Photo {
    const photo: Photo = {
      id: randomUUID(),
      eventId: input.eventId,
      filename: input.filename,
      url: input.url,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date().toISOString(),
    };
    photosById.set(photo.id, photo);
    return photo;
  },

  findById(id: string): Photo | undefined {
    return photosById.get(id);
  },

  listByEvent(eventId: string): Photo[] {
    return [...photosById.values()]
      .filter((photo) => photo.eventId === eventId)
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? -1 : 1));
  },

  listAll(): Photo[] {
    return [...photosById.values()];
  },
};
