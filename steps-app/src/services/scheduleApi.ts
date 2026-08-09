import { api } from "./api";

export type WeekDay = "sun" | "mon" | "tue" | "wed" | "thu";

export const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu"];

export type ScheduleActivity = {
  id: string;
  day: WeekDay;
  name: string;
  emoji: string;
  /** 24-hour "HH:MM" — format for display, don't show raw. */
  startTime: string;
  durationMinutes: number;
  accentColor: string | null;
};

export type ScheduleDay = { day: WeekDay; activities: ScheduleActivity[] };

export type ActivityInput = {
  day: WeekDay;
  name: string;
  emoji?: string;
  startTime: string;
  durationMinutes?: number;
  accentColor?: string | null;
};

/** "08:30" → "8:30 AM". Kept on the client so storage stays sortable. */
export function formatTime(startTime: string): string {
  const [rawHour, minute] = startTime.split(":");
  const hour = Number(rawHour);
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

export async function getWeekSchedule() {
  const { data } = await api.get<{ days: ScheduleDay[] }>("/api/schedule");
  return data.days;
}

export async function createActivity(input: ActivityInput) {
  const { data } = await api.post<{ activity: ScheduleActivity }>("/api/schedule", input);
  return data.activity;
}

export async function updateActivity(activityId: string, input: Partial<ActivityInput>) {
  const { data } = await api.patch<{ activity: ScheduleActivity }>(
    `/api/schedule/${activityId}`,
    input
  );
  return data.activity;
}

export async function deleteActivity(activityId: string) {
  await api.delete(`/api/schedule/${activityId}`);
}
