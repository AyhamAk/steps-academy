import { api } from "./api";

export type Announcement = {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
};

export async function getLatestAnnouncement() {
  const { data } = await api.get<{ announcement: Announcement | null }>(
    "/api/announcements/latest"
  );
  return data.announcement;
}

export async function createAnnouncement(text: string) {
  const { data } = await api.post<{ announcement: Announcement }>("/api/announcements", {
    text,
  });
  return data.announcement;
}
