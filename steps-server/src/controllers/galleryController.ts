import { Request, Response } from "express";

import { EventModel } from "../models/event";
import { PhotoModel } from "../models/photo";
import { PhotoTagModel } from "../models/photoTag";
import { UserModel } from "../models/user";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function serializePhoto(photoId: string) {
  const photo = PhotoModel.findById(photoId)!;
  const tags = PhotoTagModel.listByPhoto(photo.id);
  return {
    id: photo.id,
    eventId: photo.eventId,
    url: photo.url,
    uploadedAt: photo.uploadedAt,
    tags: tags.map((tag) => ({ id: tag.id, studentName: tag.studentName })),
  };
}

export function createEvent(req: Request, res: Response) {
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

  const event = EventModel.create({
    name,
    date,
    attendees: cleanAttendees,
    createdBy: req.userId!,
  });

  res.status(201).json({ event });
}

export function listEvents(_req: Request, res: Response) {
  const events = EventModel.listAll().map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date,
    attendees: event.attendees,
    photoCount: PhotoModel.listByEvent(event.id).length,
  }));
  res.json({ events });
}

export function getNextEvent(_req: Request, res: Response) {
  const event = EventModel.findNext();
  if (!event) {
    return res.json({ event: null });
  }
  res.json({ event: { id: event.id, name: event.name, date: event.date } });
}

export function uploadPhotos(req: Request, res: Response) {
  const event = EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ message: "At least one photo file is required" });
  }

  const photos = files.map((file) => {
    const photo = PhotoModel.create({
      eventId: event.id,
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      uploadedBy: req.userId!,
    });
    event.attendees.forEach((name) => PhotoTagModel.create(photo.id, name));
    return serializePhoto(photo.id);
  });

  res.status(201).json({ photos });
}

export function listEventPhotos(req: Request, res: Response) {
  const event = EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const photos = PhotoModel.listByEvent(event.id).map((photo) => serializePhoto(photo.id));
  res.json({ event: { id: event.id, name: event.name, date: event.date }, photos });
}

export function addTag(req: Request, res: Response) {
  const photo = PhotoModel.findById(param(req, "photoId"));
  if (!photo) {
    return res.status(404).json({ message: "Photo not found" });
  }

  const { studentName } = req.body as { studentName?: string };
  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ message: "studentName is required" });
  }

  const tag = PhotoTagModel.create(photo.id, studentName);
  res.status(201).json({ photo: serializePhoto(photo.id), tag });
}

export function removeTag(req: Request, res: Response) {
  const photo = PhotoModel.findById(param(req, "photoId"));
  if (!photo) {
    return res.status(404).json({ message: "Photo not found" });
  }

  const tag = PhotoTagModel.findById(param(req, "tagId"));
  if (!tag || tag.photoId !== photo.id) {
    return res.status(404).json({ message: "Tag not found on this photo" });
  }

  PhotoTagModel.remove(tag.id);
  res.json({ photo: serializePhoto(photo.id) });
}

export function listStudents(_req: Request, res: Response) {
  const names = new Set<string>();
  EventModel.listAll().forEach((event) => event.attendees.forEach((name) => names.add(name)));
  PhotoTagModel.listAll().forEach((tag) => names.add(tag.studentName));

  res.json({ students: [...names].sort((a, b) => a.localeCompare(b)) });
}

export function myGallery(req: Request, res: Response) {
  const user = UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.childNames.length === 0) {
    return res.json({ groups: [] });
  }

  const groups = EventModel.listAll()
    .map((event) => {
      const photos = PhotoModel.listByEvent(event.id)
        .filter((photo) => PhotoTagModel.matchesAnyChild(photo.id, user.childNames))
        .map((photo) => serializePhoto(photo.id));
      return {
        event: { id: event.id, name: event.name, date: event.date },
        photos,
      };
    })
    .filter((group) => group.photos.length > 0);

  res.json({ groups });
}

export function myEventGallery(req: Request, res: Response) {
  const user = UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const event = EventModel.findById(param(req, "eventId"));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  const photos = PhotoModel.listByEvent(event.id)
    .filter((photo) => PhotoTagModel.matchesAnyChild(photo.id, user.childNames))
    .map((photo) => serializePhoto(photo.id));

  res.json({ event: { id: event.id, name: event.name, date: event.date }, photos });
}
