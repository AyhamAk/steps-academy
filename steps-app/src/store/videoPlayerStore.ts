import { Photo } from "../services/galleryApi";

/**
 * The videos the player screen opens on. Handed over here rather than as
 * route params: an album's videos (with signed URLs) are too long for a URL.
 */
let current: { videos: Photo[]; albumId: string } = { videos: [], albumId: "" };

export function setPlayerVideos(albumId: string, videos: Photo[]) {
  current = { albumId, videos };
}

export function getPlayerVideos() {
  return current;
}
