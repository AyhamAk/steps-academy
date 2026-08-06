import { api } from "./api";

export type NotificationType = "photo" | "announcement" | "event";

export type AppNotification = {
  id: string;
  type: NotificationType;
  childName?: string;
  eventName?: string;
  eventId?: string;
  read: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export async function getNotifications() {
  const { data } = await api.get<NotificationsResponse>("/api/notifications");
  return data;
}

export async function markNotificationsRead() {
  const { data } = await api.post<NotificationsResponse>("/api/notifications/read");
  return data;
}
