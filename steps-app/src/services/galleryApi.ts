import { AxiosError, AxiosProgressEvent } from "axios";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";

import { api, API_BASE_URL } from "./api";

export type PhotoTag = {
  id: string;
  studentId: string;
  /** Display only — visibility is decided by studentId, never by this string. */
  studentName: string;
};

export type MediaType = "photo" | "video";

/**
 * A photo or, since albums can hold them, a video. For a video `url` is the
 * video file and `thumbnailUrl` its poster. Lists only include videos when
 * asked to (`media: "all"`), so anything reading them as stills is safe.
 */
export type Photo = {
  id: string;
  eventId: string;
  /** Absent from servers older than videos; treat as "photo". */
  type?: MediaType;
  url: string;
  thumbnailUrl?: string | null;
  durationSec?: number;
  uploadedAt: string;
  tags: PhotoTag[];
};

export type MediaCounts = { all: number; photo: number; video: number };

export const isVideo = (item: Photo) => item.type === "video";

/** The longest and largest video an admin can add; the server checks too. */
export const MAX_VIDEO_SECONDS = 100;
export const MAX_VIDEO_MB = 100;

export type EventAttendee = { id: string; name: string };

/** Which program an album belongs to. Albums made before this existed are "both". */
export type Program = "nursery" | "courses" | "both";

/** One side of the gallery: the nursery's albums, or the courses'. */
export type PhotoSection = Exclude<Program, "both">;

export const PROGRAMS: Program[] = ["nursery", "courses", "both"];

/** True if an album shows on this side. "Both" shows on either. */
export function isInSection(event: { program?: Program }, section: PhotoSection): boolean {
  // An older server sends no program at all; treat that as "both" rather than
  // hiding every album until it is updated.
  const program = event.program ?? "both";
  return program === "both" || program === section;
}

export type GalleryEvent = {
  id: string;
  name: string;
  date: string;
  attendees: EventAttendee[];
  /** Admin-written note shown to parents. Null when none has been set. */
  caption: string | null;
  program: Program;
  photoCount: number;
  /** A few signed thumbnails so the admin list can preview without drilling in. */
  previewUrls: string[];
};

export type EventSummary = {
  id: string;
  name: string;
  date: string;
  caption: string | null;
  program: Program;
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

export async function createEvent(input: {
  name: string;
  date: string;
  attendeeIds: string[];
  program: Program;
}) {
  const { data } = await api.post<{ event: GalleryEvent }>("/api/gallery/events", input);
  return data.event;
}

/** Admin: rename an album, move it to another date or change its program. */
export async function updateEvent(
  eventId: string,
  input: { name?: string; date?: string; program?: Program }
) {
  const { data } = await api.patch<{ event: GalleryEvent }>(
    `/api/gallery/events/${eventId}`,
    input
  );
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

export type PickedVideo = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  /** Milliseconds, as the picker reports it. */
  duration?: number | null;
};

/** Why a video was refused, in a form the screen can translate. */
export class VideoUploadError extends Error {
  constructor(public code: "video_too_big" | "video_too_long" | "video_type" | "upload_failed") {
    super(code);
  }
}

function videoMimeType(video: PickedVideo): string {
  if (video.mimeType === "video/mp4" || video.mimeType === "video/quicktime") return video.mimeType;
  const name = (video.fileName ?? video.uri).toLowerCase();
  return name.endsWith(".mov") ? "video/quicktime" : "video/mp4";
}

async function fileSizeOf(uri: string): Promise<number> {
  const info = await LegacyFileSystem.getInfoAsync(uri);
  return info.exists ? info.size : 0;
}

/** PUTs a local file to a signed R2 link, reporting 0–100. */
async function putFile(url: string, uri: string, contentType: string, onProgress?: (percent: number) => void) {
  const task = LegacyFileSystem.createUploadTask(
    url,
    uri,
    {
      httpMethod: "PUT",
      uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": contentType },
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (onProgress && totalBytesExpectedToSend > 0) {
        onProgress(Math.round((totalBytesSent / totalBytesExpectedToSend) * 100));
      }
    },
  );
  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) throw new VideoUploadError("upload_failed");
}

/**
 * Adds a video to an album: poster made on the phone, both files sent
 * straight to storage through signed links, then recorded like a photo —
 * tagged with the album's children, so the same families see it.
 */
export async function uploadEventVideo(
  eventId: string,
  video: PickedVideo,
  onProgress?: (percent: number) => void,
  /** A poster already made for the upload tile; made here otherwise. */
  posterUri?: string,
): Promise<Photo> {
  const durationSec = Math.round((video.duration ?? 0) / 1000);
  if (durationSec > MAX_VIDEO_SECONDS) throw new VideoUploadError("video_too_long");
  const sizeBytes = video.fileSize || (await fileSizeOf(video.uri));
  if (sizeBytes > MAX_VIDEO_MB * 1024 * 1024) throw new VideoUploadError("video_too_big");

  const mimeType = videoMimeType(video);
  const poster = posterUri
    ? { uri: posterUri }
    : await VideoThumbnails.getThumbnailAsync(video.uri, { time: 1000, quality: 0.7 });
  const posterBytes = await fileSizeOf(poster.uri);

  try {
    const { data: links } = await api.post<{
      videoKey: string;
      posterKey: string;
      videoPutUrl: string;
      posterPutUrl: string;
    }>(`/api/gallery/events/${eventId}/videos/presign`, { mimeType, sizeBytes, durationSec, posterBytes });

    await putFile(links.posterPutUrl, poster.uri, "image/jpeg");
    // The poster is small; the bar reflects the video, which is the wait.
    await putFile(links.videoPutUrl, video.uri, mimeType, (percent) => onProgress?.(Math.min(percent, 99)));

    const { data } = await api.post<{ photo: Photo }>(`/api/gallery/events/${eventId}/videos`, {
      videoKey: links.videoKey,
      posterKey: links.posterKey,
      durationSec,
      mimeType,
      sizeBytes,
      filename: video.fileName ?? undefined,
    });
    onProgress?.(100);
    return data.photo;
  } catch (error) {
    if (error instanceof VideoUploadError) throw error;
    const code = (error as AxiosError<{ code?: string }>).response?.data?.code;
    if (code === "video_too_big" || code === "video_too_long" || code === "video_type") {
      throw new VideoUploadError(code);
    }
    throw new VideoUploadError("upload_failed");
  }
}

/**
 * Announces a finished album to the families of the children in it.
 *
 * Safe to call more than once - the server only notifies the first time.
 */
export async function publishEvent(eventId: string) {
  const { data } = await api.post<{ published: boolean }>(
    `/api/gallery/events/${eventId}/publish`
  );
  return data.published;
}

export async function listEventPhotosAdmin(eventId: string) {
  const { data } = await api.get<{ event: EventSummary; photos: Photo[] }>(
    `/api/gallery/events/${eventId}/photos`,
    { params: { media: "all" } }
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

/** A short message the academy pins above every album. */
export async function getGalleryQuote() {
  const { data } = await api.get<{ quote: string | null }>("/api/gallery/quote");
  return data.quote;
}

export async function setGalleryQuote(quote: string | null) {
  const { data } = await api.put<{ quote: string | null }>("/api/gallery/quote", { quote });
  return data.quote;
}

export async function myGallery() {
  const { data } = await api.get<{ groups: GalleryGroup[] }>("/api/gallery/me");
  return data.groups;
}

/** One album, photos and videos, with how many of each this family can see. */
export async function myEventGallery(eventId: string) {
  const { data } = await api.get<{ event: EventSummary; photos: Photo[]; counts?: MediaCounts }>(
    `/api/gallery/me/${eventId}`,
    { params: { media: "all" } }
  );
  return data;
}
