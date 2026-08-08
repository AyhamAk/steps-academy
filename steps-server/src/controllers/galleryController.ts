import { Request, Response } from "express";

import { getSignedGetUrl } from "../lib/r2";
import { processAndUploadImage } from "../lib/imageUpload";
import { sendPushToUsers } from "../lib/push";
import { DEFAULT_PAGE_SIZE, EventModel } from "../models/event";
import { NotificationModel } from "../models/notification";
import { Photo, PhotoModel } from "../models/photo";
import { PhotoTagModel } from "../models/photoTag";
import { UserModel } from "../models/user";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function pagination(req: Request): { limit: number; offset: number } {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
}

/** Every photo read goes through a signed URL — nothing in R2 is public. */
async function resolvePhotoUrl(photo: Photo): Promise<string> {
  if (photo.externalUrl) return photo.externalUrl;
  return getSignedGetUrl(photo.mediumKey ?? photo.key!);
}

function serializePhotoWithTags(photo: Photo, tags: { id: string; studentName: string }[]) {
  return resolvePhotoUrl(photo).then((url) => ({
    id: photo.id,
    eventId: photo.eventId,
    url,
    uploadedAt: photo.uploadedAt,
    tags: tags.map((tag) => ({ id: tag.id, studentName: tag.studentName })),
  }));
}

async function serializePhoto(photoId: string) {
  const photo = (await PhotoModel.findById(photoId))!;
  const tags = await PhotoTagModel.listByPhoto(photo.id);
  return serializePhotoWithTags(photo, tags);
}

export async function createEvent(req: Request, res: Response) {
  const { name, date, attendees } = req.body as {
    name?: string;
    date?: string;
    attendees?: string[];
  };

  if (!name || !date) {
    return res.status(400).json({ message: "name and date are required" });
  }
  if (attendees !== undefined && !Array.isArray(attendees)) {
    return res.status(400).json({ message: "attendees must be an array of strings" });
  }

  const cleanAttendees = (attendees ?? [])
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.trim())
    .filter(Boolean);

  const event = await EventModel.create({
    name,
    date,
    attendees: cleanAttendees,
    createdBy: req.userId!,
  });

  // Notify every parent about the new event.
  const parents = await UserModel.listParents();
  await NotificationModel.createForUsers(parents.map((parent) => parent.id), {
    type: "event",
    eventName: event.name,
    eventId: event.id,
  });
  await sendPushToUsers(parents, {
    title: "New event",
    body: event.name,
    data: { type: "event", eventId: event.id },
  });

  res.status(201).json({ event });
}

export async function listEvents(req: Request, res: Response) {
  const { limit, offset } = pagination(req);
  const rawEvents = await EventModel.listAll(limit, offset);
  const events = await Promise.all(
    rawEvents.map(async (event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      attendees: event.attendees,
      photoCount: (await PhotoModel.listByEvent(event.id, 1000)).length,
    }))
  );
  res.json({ events });
}

export async function getNextEvent(_req: Request, res: Response) {
  const event = await EventModel.findNext();
  if (!event) {
    return res.json({ event: null });
  }
  res.json({ event: { id: event.id, name: event.name, date: event.date } });
}

export async function uploadPhotos(req: Request, res: Response) {
  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ message: "At least one photo file is required" });
  }

  // Sequential, not Promise.all — each file is resized (sharp) and pushed to
  // R2 in memory; running 20 uploads concurrently could spike memory badly.
  const photos = [];
  for (const file of files) {
    const { key, thumbKey, mediumKey } = await processAndUploadImage(
      event.id,
      file.buffer,
      file.mimetype
    );
    const photo = await PhotoModel.create({
      eventId: event.id,
      filename: file.originalname,
      key,
      thumbKey,
      mediumKey,
      uploadedBy: req.userId!,
    });
    await Promise.all(event.attendees.map((name) => PhotoTagModel.create(photo.id, name)));
    photos.push(await serializePhoto(photo.id));
  }

  // Notify once per tagged child for this whole batch — not once per photo,
  // which would spam a parent with 20 notifications for a 20-photo upload.
  if (event.attendees.length > 0) {
    const parents = await UserModel.listParents();
    for (const name of event.attendees) {
      const matched = parents.filter((parent) =>
        parent.childNames.some((childName) => childName.toLowerCase() === name.toLowerCase())
      );
      if (matched.length === 0) continue;

      await NotificationModel.createForUsers(matched.map((parent) => parent.id), {
        type: "photo",
        childName: name,
        eventId: event.id,
      });
      await sendPushToUsers(matched, {
        title: `New photos of ${name}`,
        body:
          photos.length === 1
            ? `1 new photo from ${event.name}`
            : `${photos.length} new photos from ${event.name}`,
        data: { type: "photo", eventId: event.id },
      });
    }
  }

  res.status(201).json({ photos });
}

export async function listEventPhotos(req: Request, res: Response) {
  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const { limit, offset } = pagination(req);
  const rawPhotos = await PhotoModel.listByEvent(event.id, limit, offset);
  const photos = await Promise.all(rawPhotos.map((photo) => serializePhoto(photo.id)));
  res.json({ event: { id: event.id, name: event.name, date: event.date }, photos });
}

export async function addTag(req: Request, res: Response) {
  const photo = await PhotoModel.findById(param(req, "photoId"));
  if (!photo) {
    return res.status(404).json({ message: "Photo not found" });
  }

  const { studentName } = req.body as { studentName?: string };
  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ message: "studentName is required" });
  }

  const trimmed = studentName.trim();
  const tag = await PhotoTagModel.create(photo.id, trimmed);

  // Notify the parent(s) of the tagged child that a new photo is available.
  const matched = (await UserModel.listParents()).filter((parent) =>
    parent.childNames.some((name) => name.toLowerCase() === trimmed.toLowerCase())
  );
  await NotificationModel.createForUsers(matched.map((parent) => parent.id), {
    type: "photo",
    childName: trimmed,
    eventId: photo.eventId,
  });
  await sendPushToUsers(matched, {
    title: `New photo of ${trimmed}`,
    body: "Tap to view it in the gallery",
    data: { type: "photo", eventId: photo.eventId },
  });

  res.status(201).json({ photo: await serializePhoto(photo.id), tag });
}

export async function removeTag(req: Request, res: Response) {
  const photo = await PhotoModel.findById(param(req, "photoId"));
  if (!photo) {
    return res.status(404).json({ message: "Photo not found" });
  }

  const tag = await PhotoTagModel.findById(param(req, "tagId"));
  if (!tag || tag.photoId !== photo.id) {
    return res.status(404).json({ message: "Tag not found on this photo" });
  }

  await PhotoTagModel.remove(tag.id);
  res.json({ photo: await serializePhoto(photo.id) });
}

export async function listStudents(_req: Request, res: Response) {
  const names = new Set<string>();
  const events = await EventModel.listAll(1000);
  events.forEach((event) => event.attendees.forEach((name) => names.add(name)));
  (await PhotoTagModel.listAll()).forEach((tag) => names.add(tag.studentName));

  res.json({ students: [...names].sort((a, b) => a.localeCompare(b)) });
}

export async function myGallery(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.childNames.length === 0) {
    return res.json({ groups: [] });
  }

  const events = await EventModel.listAll();
  const groups = (
    await Promise.all(
      events.map(async (event) => {
        const eventPhotos = await PhotoModel.listByEvent(event.id, 1000);
        const tagsByPhoto = await PhotoTagModel.listByPhotoIds(eventPhotos.map((photo) => photo.id));
        const matched = await Promise.all(
          eventPhotos
            .map((photo) => ({
              photo,
              tags: tagsByPhoto.filter((tag) => tag.photoId === photo.id),
            }))
            .filter(({ tags }) => PhotoTagModel.tagsMatchAnyChild(tags, user.childNames))
            .map(({ photo, tags }) => serializePhotoWithTags(photo, tags))
        );
        return {
          event: { id: event.id, name: event.name, date: event.date },
          photos: matched,
        };
      })
    )
  ).filter((group) => group.photos.length > 0);

  res.json({ groups });
}

export async function myEventGallery(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const { limit, offset } = pagination(req);
  const eventPhotos = await PhotoModel.listByEvent(event.id, limit, offset);
  const tagsByPhoto = await PhotoTagModel.listByPhotoIds(eventPhotos.map((photo) => photo.id));
  const photos = await Promise.all(
    eventPhotos
      .map((photo) => ({
        photo,
        tags: tagsByPhoto.filter((tag) => tag.photoId === photo.id),
      }))
      .filter(({ tags }) => PhotoTagModel.tagsMatchAnyChild(tags, user.childNames))
      .map(({ photo, tags }) => serializePhotoWithTags(photo, tags))
  );

  res.json({ event: { id: event.id, name: event.name, date: event.date }, photos });
}
