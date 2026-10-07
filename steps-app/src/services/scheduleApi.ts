import { Translations } from "../i18n/translations";
import { ltrIsolate, NBSP } from "../utils/bidi";
import { api } from "./api";

export type WeekDay = "sun" | "mon" | "tue" | "wed" | "thu";

export const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu"];

/** Courses can also meet on the weekend; the nursery week above cannot. */
export type CourseDay = WeekDay | "fri" | "sat";

export const COURSE_DAYS: CourseDay[] = [...WEEK_DAYS, "fri", "sat"];

/**
 * The parts of a nursery day, in order. Every activity belongs to one; what
 * happens inside it changes day to day.
 *
 * The times are only the academy's usual day, used to prefill a new activity.
 * The timetable always shows each activity's own start time and duration.
 */
export const SCHEDULE_SLOTS = [
  { slot: "reception", startTime: "07:30", durationMinutes: 90 },
  { slot: "breakfast", startTime: "09:00", durationMinutes: 30 },
  { slot: "prepAndFreeChoice", startTime: "09:30", durationMinutes: 30 },
  { slot: "dailyActivity", startTime: "10:00", durationMinutes: 75 },
  { slot: "storyOrCircle", startTime: "11:15", durationMinutes: 60 },
  { slot: "lunch", startTime: "12:15", durationMinutes: 30 },
  { slot: "napTime", startTime: "12:15", durationMinutes: 115 },
] as const;

export type ScheduleSlot = (typeof SCHEDULE_SLOTS)[number]["slot"];

export type ScheduleActivity = {
  id: string;
  day: WeekDay;
  slot: ScheduleSlot;
  /** Null when the slot is all there is — reception, say. */
  name: string | null;
  emoji: string;
  /** 24-hour "HH:MM" — format for display, don't show raw. */
  startTime: string;
  durationMinutes: number;
  accentColor: string | null;
};

export type ScheduleDay = { day: WeekDay; activities: ScheduleActivity[] };

/** The activity's own name, or its slot's when it has none. */
export function activityTitle(activity: ScheduleActivity, t: Translations): string {
  return activity.name ?? t.academy.slots[activity.slot] ?? "";
}

/** "07:30" plus 90 minutes → "09:00". */
export function endTimeOf(startTime: string, durationMinutes: number): string {
  const [hour, minute] = startTime.split(":").map(Number);
  const total = (hour * 60 + minute + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * "07:30–09:00", 24-hour so a range fits the timeline's narrow time column.
 * Isolated so it reads left to right inside an Arabic or Hebrew row.
 */
export function formatTimeRange(activity: ScheduleActivity): string {
  return ltrIsolate(`${activity.startTime}–${endTimeOf(activity.startTime, activity.durationMinutes)}`);
}

export type ActivityInput = {
  day: WeekDay;
  slot: ScheduleSlot;
  name: string | null;
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

/**
 * FIGURE SPACE — the same advance width as a digit in a tabular-figures font.
 * Padding a single-digit hour with one makes "9:00" occupy exactly as much
 * room as "10:30".
 */
const FIGURE_SPACE = " ";

/**
 * A time for a fixed-width column, e.g. a timeline gutter.

 * Tabular figures alone only equalise digit *shapes*; a one-digit hour is
 * still a whole digit narrower than a two-digit one, which is what left the
 * gutter ragged at its outer edge. Padding the hour makes every row the same
 * width, so both edges of the column are straight.
 *
 * Only for columns — the padding would show as a stray space inline.
 */
export function formatTimeColumn(startTime: string, t: Translations): string {
  const [rawHour, minute] = startTime.split(":");
  const hour = Number(rawHour);
  const suffix = hour < 12 ? t.common.am : t.common.pm;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  const padded = display < 10 ? `${FIGURE_SPACE}${display}` : String(display);
  return ltrIsolate(`${padded}:${minute}${NBSP}${suffix}`);
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
