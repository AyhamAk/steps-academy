/** The 11-character video id from a watch, youtu.be, shorts or embed link. */
const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/;

export function youtubeVideoId(url: string): string | null {
  return url.match(YOUTUBE_ID)?.[1] ?? null;
}

/**
 * YouTube's own still for the video, so a tip never needs a separate image
 * upload. Same check the server runs before it accepts a link.
 */
export function youtubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function isYoutubeUrl(url: string): boolean {
  return /^https?:\/\//.test(url) && youtubeVideoId(url) !== null;
}
