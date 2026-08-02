import { AxiosProgressEvent } from "axios";

import { api, API_BASE_URL } from "./api";

export type PhotoTag = {
  id: string;
  studentName: string;
};

export type Photo = {
  id: string;
  eventId: string;
  url: string;
  uploadedAt: string;
  tags: PhotoTag[];
};

export type GalleryEvent = {
  id: string;
  name: string;
  date: string;
  attendees: string[];
  photoCount: number;
};

export type GalleryGroup = {
  event: { id: string; name: string; date: string };
  photos: Photo[];
};

export function resolvePhotoUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
}

/** Names from `childNames` that are tagged in this photo. */
export function matchedTagNames(photo: Photo, childNames: string[]): string[] {
  if (childNames.length === 0) return [];
  return photo.tags.map((tag) => tag.studentName).filter((name) => childNames.includes(name));
}

/** True if any of the parent's children are tagged in this photo. */
export function isPhotoTaggedWithAny(photo: Photo, childNames: string[]): boolean {
  return matchedTagNames(photo, childNames).length > 0;
}

export async function listEvents() {
  const { data } = await api.get<{ events: GalleryEvent[] }>("/api/gallery/events");
  return data.events;
}

export async function createEvent(input: { name: string; date: string; attendees: string[] }) {
  const { data } = await api.post<{ event: GalleryEvent }>("/api/gallery/events", input);
  return data.event;
}

export type NextEvent = { id: string; name: string; date: string };

export async function getNextEvent() {
  const { data } = await api.get<{ event: NextEvent | null }>("/api/gallery/events/next");
  return data.event;
}

export async function listStudents() {
  const { data } = await api.get<{ students: string[] }>("/api/gallery/students");
  return data.students;
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
  const { data } = await api.get<{
    event: { id: string; name: string; date: string };
    photos: Photo[];
  }>(`/api/gallery/events/${eventId}/photos`);
  return data;
}

export async function addPhotoTag(photoId: string, studentName: string) {
  const { data } = await api.post<{ photo: Photo }>(`/api/gallery/photos/${photoId}/tags`, {
    studentName,
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
  const { data } = await api.get<{
    event: { id: string; name: string; date: string };
    photos: Photo[];
  }>(`/api/gallery/me/${eventId}`);
  return data;
}
