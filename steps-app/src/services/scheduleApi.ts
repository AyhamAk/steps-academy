import { Translations } from "../i18n/translations";
import { ltrIsolate, NBSP } from "../utils/bidi";
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

/**
 * "08:30" → "8:30 AM", or "8:30 ص" in Arabic. Kept on the client so storage
 * stays sortable.
 *
 * The result is bidi-isolated and joined with a non-breaking space, because
 * this string is nearly always shown inside an Arabic or Hebrew line: without
 * the isolate the surrounding RTL run reordered it ("AM" landing between the
 * hour and the minutes), and without the NBSP a wrap could orphan "PM" on a
 * line of its own.
 */
export function formatTime(startTime: string, t: Translations): string {
  const [rawHour, minute] = startTime.split(":");
  const hour = Number(rawHour);
  const suffix = hour < 12 ? t.common.am : t.common.pm;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return ltrIsolate(`${display}:${minute}${NBSP}${suffix}`);
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
