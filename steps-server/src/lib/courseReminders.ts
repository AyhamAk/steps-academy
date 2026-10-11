import { WeekDay } from "@prisma/client";

import { prisma } from "./prisma";
import { sendPushToUsers } from "./push";
import { courseTomorrow, PushLocale } from "./pushCopy";

/**
 * The evening before a course meets, its families get a reminder.
 *
 * Checked every ten minutes rather than fired once at 19:00, so a restart
 * around that time does not lose the evening. Each course is reminded once
 * per date: the first server to claim the AppSetting key sends it, and any
 * other copy of the server finds the key taken and does nothing.
 */

const CHECK_MS = 10 * 60 * 1000;
/** Israel time. Nothing goes out after 22:00 — too late to be kind. */
const SEND_FROM_HOUR = 19;
const SEND_UNTIL_HOUR = 22;

const DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function israelNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function nextDay(date: string): { date: string; weekDay: WeekDay } {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { date: next.toISOString().slice(0, 10), weekDay: DAYS[next.getUTCDay()] };
}

function nameFor(course: { name: string; nameAr: string | null; nameHe: string | null }, locale: PushLocale) {
  if (locale === "ar") return course.nameAr || course.name;
  if (locale === "he") return course.nameHe || course.name;
  return course.name;
}

/** True for the one caller that gets to send this course's reminder for this date. */
async function claim(courseId: string, date: string): Promise<boolean> {
  try {
    await prisma.appSetting.create({ data: { key: `courseReminder:${courseId}:${date}`, value: "sent" } });
    return true;
  } catch {
    return false;
  }
}

export async function sendCourseReminders(now = new Date()): Promise<void> {
  try {
    const today = israelNow(now);
    if (today.hour < SEND_FROM_HOUR || today.hour >= SEND_UNTIL_HOUR) return;
    const tomorrow = nextDay(today.date);

    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        weekDays: { has: tomorrow.weekDay },
        // Dates are "YYYY-MM-DD" strings, so they compare as text.
        OR: [{ startDate: null }, { startDate: { lte: tomorrow.date } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: tomorrow.date } }] }],
      },
      include: {
        enrollments: {
          where: { status: "approved" },
          include: { student: { include: { guardians: { include: { parent: true } } } } },
        },
      },
    });

    for (const course of courses) {
      if (course.enrollments.length === 0) continue;
      if (!(await claim(course.id, tomorrow.date))) continue;

      // One push per family, naming every child of theirs in the course.
      const families = new Map<string, { parent: (typeof course.enrollments)[number]["student"]["guardians"][number]["parent"]; children: string[] }>();
      for (const enrollment of course.enrollments) {
        for (const { parent } of enrollment.student.guardians) {
          const family = families.get(parent.id) ?? { parent, children: [] };
          family.children.push(enrollment.student.name);
          families.set(parent.id, family);
        }
      }

      for (const { parent, children } of families.values()) {
        await sendPushToUsers([parent], (locale) => ({
          ...courseTomorrow(children.join("، "), nameFor(course, locale), course.startTime, locale),
          data: { type: "course", courseId: course.id },
        }));
      }
      console.log(`[courses] reminded ${families.size} families about "${course.name}" on ${tomorrow.date}`);
    }
  } catch (error) {
    // A failed check must never take the API down; the next one retries.
    console.error("[courses] reminders failed:", error);
  }
}

export function scheduleCourseReminders(): void {
  void sendCourseReminders();
  const timer = setInterval(() => void sendCourseReminders(), CHECK_MS);
  timer.unref?.();
}
