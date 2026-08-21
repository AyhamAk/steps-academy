import { Request, Response } from "express";

import { processAndUploadImage } from "../lib/imageUpload";
import { sendPushToUsers } from "../lib/push";
import { albumPublished } from "../lib/pushCopy";
import { getSignedGetUrl } from "../lib/r2";
import { DEFAULT_PAGE_SIZE, EventModel } from "../models/event";
import { NotificationModel } from "../models/notification";
import { Photo, PhotoModel } from "../models/photo";
import { PhotoTagModel } from "../models/photoTag";
import { SETTING_KEYS, SettingModel } from "../models/setting";
import { StudentModel } from "../models/student";
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

type TagShape = { id: string; studentId: string; student: { id: string; name: string } };

/** Every photo read goes through a signed URL — nothing in R2 is public. */
async function resolvePhotoUrl(photo: Photo): Promise<string> {
  if (photo.externalUrl) return photo.externalUrl;
  return getSignedGetUrl(photo.mediumKey ?? photo.key!);
}

async function serializePhotoWithTags(photo: Photo, tags: TagShape[]) {
  return {
    id: photo.id,
    eventId: photo.eventId,
    url: await resolvePhotoUrl(photo),
    uploadedAt: photo.uploadedAt,
    tags: tags.map((tag) => ({
      id: tag.id,
      studentId: tag.studentId,
      studentName: tag.student.name,
    })),
  };
}

async function serializePhoto(photoId: string) {
  const photo = (await PhotoModel.findById(photoId))!;
  const tags = await PhotoTagModel.listByPhoto(photo.id);
  return serializePhotoWithTags(photo, tags);
}

function serializeEvent(event: {
  id: string;
  name: string;
  date: string;
  caption: string | null;
  attendees?: { id: string; name: string }[];
}) {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    caption: event.caption,
    // Always an array, never absent: the app reads .length off this without
    // guarding, so omitting it crashed the gallery the moment an album was
    // created. An event with no attendees is [], not undefined.
    attendees: event.attendees ?? [],
  };
}

export async function createEvent(req: Request, res: Response) {
  const { name, date, attendeeIds } = req.body as {
    name?: string;
    date?: string;
    attendeeIds?: unknown;
  };

  if (!name || !date) {
    return res.status(400).json({ message: "name and date are required" });
  }
  if (attendeeIds !== undefined && !Array.isArray(attendeeIds)) {
    return res.status(400).json({ message: "attendeeIds must be an array of student ids" });
  }

  const requestedIds = (attendeeIds ?? []).filter((id): id is string => typeof id === "string");
  // Only ids that resolve to real students — a bad id must not silently create
  // an event whose attendee list doesn't match what the admin picked.
  const students = await StudentModel.listByIds(requestedIds);
  if (students.length !== requestedIds.length) {
    return res.status(400).json({ message: "One or more attendeeIds are not valid students" });
  }

  const event = await EventModel.create({
    name,
    date,
    attendeeIds: students.map((student) => student.id),
    createdBy: req.userId!,
  });

  // Deliberately silent. An event is created empty and the admin then uploads
  // into it, so announcing here told families about an album with no photos in
  // it. Families are told once, from publishEvent, when the admin is finished.

  res.status(201).json({
    event: { ...serializeEvent(event), photoCount: 0, previewUrls: [], attendees: event.attendees ?? [] },
  });
}

export async function listEvents(req: Request, res: Response) {
  const { limit, offset } = pagination(req);
  const events = await EventModel.listWithPhotoCounts(limit, offset);
  res.json({
    events: await Promise.all(
      events.map(async (event) => ({
        ...serializeEvent(event),
        photoCount: event.photoCount,
        // Signed thumbnails so the admin list can show real previews rather
        // than a wall of text.
        previewUrls: await Promise.all(
          event.previewPhotos.map((photo) =>
            photo.externalUrl
              ? Promise.resolve(photo.externalUrl)
              : getSignedGetUrl(photo.thumbKey ?? photo.mediumKey ?? photo.key!)
          )
        ),
      }))
    ),
  });
}

export async function updateEventCaption(req: Request, res: Response) {
  const { caption } = req.body as { caption?: unknown };

  if (caption !== null && typeof caption !== "string") {
    return res.status(400).json({ message: "caption must be a string or null" });
  }
  // Empty/whitespace-only clears the caption rather than storing a blank one.
  const trimmed = typeof caption === "string" ? caption.trim() : null;
  if (trimmed && trimmed.length > 300) {
    return res.status(400).json({ message: "caption must be 300 characters or fewer" });
  }

  const event = await EventModel.updateCaption(param(req, "eventId"), trimmed || null);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json({ event: serializeEvent(event) });
}

/** Admin: rename an album or change its date. */
export async function updateEvent(req: Request, res: Response) {
  const { name, date } = req.body as { name?: unknown; date?: unknown };

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ message: "name must be a non-empty string" });
  }
  if (name !== undefined && typeof name === "string" && name.trim().length > 100) {
    return res.status(400).json({ message: "name must be 100 characters or fewer" });
  }
  // Same shape the app sends on create, and what the date index sorts on.
  if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return res.status(400).json({ message: "date must be an ISO date (YYYY-MM-DD)" });
  }
  if (name === undefined && date === undefined) {
    return res.status(400).json({ message: "nothing to update" });
  }

  const event = await EventModel.updateDetails(param(req, "eventId"), {
    ...(typeof name === "string" ? { name: name.trim() } : {}),
    ...(typeof date === "string" ? { date } : {}),
  });
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json({ event: serializeEvent(event) });
}

export async function updateEventAttendees(req: Request, res: Response) {
  const { attendeeIds } = req.body as { attendeeIds?: unknown };
  if (!Array.isArray(attendeeIds)) {
    return res.status(400).json({ message: "attendeeIds must be an array of student ids" });
  }

  const requestedIds = attendeeIds.filter((id): id is string => typeof id === "string");
  const students = await StudentModel.listByIds(requestedIds);
  if (students.length !== requestedIds.length) {
    return res.status(400).json({ message: "One or more attendeeIds are not valid students" });
  }

  const event = await EventModel.setAttendees(param(req, "eventId"), requestedIds);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json({ event: serializeEvent(event) });
}

export async function deleteEvent(req: Request, res: Response) {
  const removed = await EventModel.remove(param(req, "eventId"));
  if (!removed) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json({ message: "Event deleted" });
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
    await Promise.all(
      event.attendees.map((student) => PhotoTagModel.create(photo.id, student.id))
    );
    photos.push(await serializePhoto(photo.id));
  }

  // Deliberately silent. The client uploads one photo per request, so
  // notifying here sent a parent one notification per photo — twenty for a
  // twenty-photo album. publishEvent tells them once, when the admin is done.

  res.status(201).json({ photos });
}

/**
 * Tells families about a finished album.
 *
 * Publishing is its own step because neither of the moments before it means
 * "this is ready to look at": the event is created empty, and photos arrive
 * one request at a time. The admin decides when it is finished.
 *
 * Guarded by notifiedAt, so tapping Done twice — or reopening a finished album
 * and closing it again — cannot notify the same families a second time.
 */
export async function publishEvent(req: Request, res: Response) {
  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  if (event.notifiedAt) {
    return res.json({ published: false, reason: "already-published" });
  }

  const photoCount = await PhotoModel.countByEvent(event.id);
  if (photoCount === 0) {
    return res.status(400).json({ message: "Add photos before publishing the album" });
  }

  // Only guardians of children who were actually at the event. Telling every
  // parent about an album their child is not in is noise, and it hints at
  // which children attended what.
  for (const student of event.attendees) {
    const guardians = await StudentModel.listGuardians(student.id);
    if (guardians.length === 0) continue;

    await NotificationModel.createForUsers(
      guardians.map((guardian) => guardian.id),
      { type: "photo", childName: student.name, eventId: event.id }
    );
    await sendPushToUsers(guardians, (locale) => ({
      ...albumPublished(event.name, locale),
      data: { type: "event", eventId: event.id },
    }));
  }

  await EventModel.markNotified(event.id);
  res.json({ published: true });
}

export async function listEventPhotos(req: Request, res: Response) {
  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const { limit, offset } = pagination(req);
  const rawPhotos = await PhotoModel.listByEvent(event.id, limit, offset);
  const tags = await PhotoTagModel.listByPhotoIds(rawPhotos.map((photo) => photo.id));
  const photos = await Promise.all(
    rawPhotos.map((photo) =>
      serializePhotoWithTags(
        photo,
        tags.filter((tag) => tag.photoId === photo.id)
      )
    )
  );
  res.json({ event: serializeEvent(event), photos });
}

export async function deletePhoto(req: Request, res: Response) {
  const removed = await PhotoModel.remove(param(req, "photoId"));
  if (!removed) {
    return res.status(404).json({ message: "Photo not found" });
  }
  res.json({ message: "Photo deleted" });
}

export async function addTag(req: Request, res: Response) {
  const photo = await PhotoModel.findById(param(req, "photoId"));
  if (!photo) {
    return res.status(404).json({ message: "Photo not found" });
  }

  const { studentId } = req.body as { studentId?: string };
  if (!studentId || typeof studentId !== "string") {
    return res.status(400).json({ message: "studentId is required" });
  }

  const student = await StudentModel.findById(studentId);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const tag = await PhotoTagModel.create(photo.id, student.id);

  // Deliberately silent. Tagging is a correction an admin makes photo by photo
  // while tidying an album, so notifying here sent a parent one push per
  // photo — twenty tags meant twenty notifications about the same album.
  // Families are told about photos when an album is created or added to
  // (see uploadPhotos), which is the moment that actually means something.

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

/** A short message the academy pins above every album in the gallery. */
export async function getGalleryQuote(_req: Request, res: Response) {
  res.json({ quote: await SettingModel.get(SETTING_KEYS.galleryQuote) });
}

export async function setGalleryQuote(req: Request, res: Response) {
  const { quote } = req.body as { quote?: unknown };
  if (quote !== null && typeof quote !== "string") {
    return res.status(400).json({ message: "quote must be a string or null" });
  }
  if (typeof quote === "string" && quote.trim().length > 280) {
    return res.status(400).json({ message: "quote must be 280 characters or fewer" });
  }
  res.json({ quote: await SettingModel.set(SETTING_KEYS.galleryQuote, quote ?? null) });
}

export async function myGallery(req: Request, res: Response) {
  const studentIds = await StudentModel.visibleStudentIds(req.userId!);
  if (studentIds.length === 0) {
    return res.json({ groups: [] });
  }

  const { limit } = pagination(req);
  // One indexed query for every visible photo, then grouped in memory —
  // previously this walked every event and pulled up to 1000 photos each.
  const photos = await PhotoModel.listForStudents(studentIds, Math.min(limit * 4, 200));

  const groups = new Map<string, { event: ReturnType<typeof serializeEvent>; photos: unknown[] }>();
  for (const photo of photos) {
    const existing = groups.get(photo.eventId);
    const serialized = await serializePhotoWithTags(photo, photo.tags);
    if (existing) {
      existing.photos.push(serialized);
    } else {
      groups.set(photo.eventId, { event: serializeEvent(photo.event), photos: [serialized] });
    }
  }

  res.json({ groups: [...groups.values()] });
}

export async function myEventGallery(req: Request, res: Response) {
  const studentIds = await StudentModel.visibleStudentIds(req.userId!);

  const event = await EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  if (studentIds.length === 0) {
    return res.json({ event: serializeEvent(event), photos: [] });
  }

  const { limit, offset } = pagination(req);
  const rawPhotos = await PhotoModel.listForStudentsInEvent(event.id, studentIds, limit, offset);
  const photos = await Promise.all(
    rawPhotos.map((photo) => serializePhotoWithTags(photo, photo.tags))
  );

  res.json({ event: serializeEvent(event), photos });
}
