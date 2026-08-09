import { AxiosProgressEvent } from "axios";

import { api, API_BASE_URL } from "./api";

export type PhotoTag = {
  id: string;
  studentId: string;
  /** Display only — visibility is decided by studentId, never by this string. */
  studentName: string;
};

export type Photo = {
  id: string;
  eventId: string;
  url: string;
  uploadedAt: string;
  tags: PhotoTag[];
};

export type EventAttendee = { id: string; name: string };

export type GalleryEvent = {
  id: string;
  name: string;
  date: string;
  attendees: EventAttendee[];
  /** Admin-written note shown to parents. Null when none has been set. */
  caption: string | null;
  photoCount: number;
};

export type EventSummary = {
  id: string;
  name: string;
  date: string;
  caption: string | null;
};

export type GalleryGroup = {
  event: EventSummary;
  photos: Photo[];
};

export function resolvePhotoUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

/** Names of this parent's children tagged in the photo, matched by student id. */
export function matchedTagNames(photo: Photo, childIds: string[]): string[] {
  if (childIds.length === 0) return [];
  return photo.tags.filter((tag) => childIds.includes(tag.studentId)).map((tag) => tag.studentName);
}

/** True if any of the parent's children are tagged in this photo. */
export function isPhotoTaggedWithAny(photo: Photo, childIds: string[]): boolean {
  return photo.tags.some((tag) => childIds.includes(tag.studentId));
}

export async function listEvents() {
  const { data } = await api.get<{ events: GalleryEvent[] }>("/api/gallery/events");
  return data.events;
}

export async function createEvent(input: { name: string; date: string; attendeeIds: string[] }) {
  const { data } = await api.post<{ event: GalleryEvent }>("/api/gallery/events", input);
  return data.event;
}

export async function updateEventAttendees(eventId: string, attendeeIds: string[]) {
  const { data } = await api.patch<{ event: GalleryEvent }>(
    `/api/gallery/events/${eventId}/attendees`,
    { attendeeIds }
  );
  return data.event;
}

export async function deleteEvent(eventId: string) {
  await api.delete(`/api/gallery/events/${eventId}`);
}

export async function deletePhoto(photoId: string) {
  await api.delete(`/api/gallery/photos/${photoId}`);
}

export type NextEvent = { id: string; name: string; date: string };

export async function getNextEvent() {
  const { data } = await api.get<{ event: NextEvent | null }>("/api/gallery/events/next");
  return data.event;
}


type PickedAsset = { uri: string; fileName?: string | null; mimeType?: string | null };

export async function uploadEventPhoto(
  eventId: string,
  asset: PickedAsset,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
  const type = asset.mimeType ?? "image/jpeg";
  form.append("photos", { uri: asset.uri, name, type } as unknown as Blob);

  const { data } = await api.post<{ photos: Photo[] }>(
    `/api/gallery/events/${eventId}/photos`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    }
  );
  return data.photos[0];
}

export async function listEventPhotosAdmin(eventId: string) {
  const { data } = await api.get<{ event: EventSummary; photos: Photo[] }>(
    `/api/gallery/events/${eventId}/photos`
  );
  return data;
}

/** Admin only. Pass null (or an empty string) to clear the caption. */
export async function updateEventCaption(eventId: string, caption: string | null) {
  const { data } = await api.patch<{ event: Omit<GalleryEvent, "photoCount"> }>(
    `/api/gallery/events/${eventId}/caption`,
    { caption }
  );
  return data.event;
}

export async function addPhotoTag(photoId: string, studentId: string) {
  const { data } = await api.post<{ photo: Photo }>(`/api/gallery/photos/${photoId}/tags`, {
    studentId,
  });
  return data.photo;
}

export async function removePhotoTag(photoId: string, tagId: string) {
  const { data } = await api.delete<{ photo: Photo }>(
    `/api/gallery/photos/${photoId}/tags/${tagId}`
  );
  return data.photo;
}

export async function myGallery() {
  const { data } = await api.get<{ groups: GalleryGroup[] }>("/api/gallery/me");
  return data.groups;
}

export async function myEventGallery(eventId: string) {
  const { data } = await api.get<{ event: EventSummary; photos: Photo[] }>(
    `/api/gallery/me/${eventId}`
  );
  return data;
}
