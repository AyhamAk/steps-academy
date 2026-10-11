import { randomUUID } from "crypto";

import {
  Prisma,
  ScheduleActivity as PrismaScheduleActivity,
  ScheduleSlot,
  WeekDay,
  WeekTemplate,
} from "@prisma/client";

import { prisma } from "../lib/prisma";

export type ScheduleActivity = PrismaScheduleActivity;
export type { ScheduleSlot, WeekDay };

/** The nursery week. Courses can also meet on Friday and Saturday. */
export const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu"];

export function isWeekDay(value: unknown): value is WeekDay {
  return typeof value === "string" && (WEEK_DAYS as string[]).includes(value);
}

/** The parts of the academy day, in order. */
export const SCHEDULE_SLOTS: ScheduleSlot[] = [
  "reception",
  "breakfast",
  "prepAndFreeChoice",
  "dailyActivity",
  "lunch",
  "storyOrCircle",
  "napTime",
  "freePlayAndTalk",
];

export function isScheduleSlot(value: unknown): value is ScheduleSlot {
  return typeof value === "string" && (SCHEDULE_SLOTS as string[]).includes(value);
}

/** The slot an activity starting at this time most likely belongs to. */
export function slotForTime(startTime: string): ScheduleSlot {
  if (startTime < "09:00") return "reception";
  if (startTime < "09:30") return "breakfast";
  if (startTime < "10:00") return "prepAndFreeChoice";
  if (startTime < "11:15") return "dailyActivity";
  if (startTime < "11:35") return "lunch";
  if (startTime < "12:15") return "storyOrCircle";
  if (startTime < "14:15") return "napTime";
  return "freePlayAndTalk";
}

// ── Weeks ────────────────────────────────────────────────────────────────────
// A week is named by its Sunday, "YYYY-MM-DD". Plain strings, so they compare
// and sort without any timezone in the way.

function toUtcDate(weekStart: string): Date {
  const [year, month, day] = weekStart.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** A real calendar date that falls on a Sunday. */
export function isWeekStart(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toUtcDate(value);
  return date.toISOString().slice(0, 10) === value && date.getUTCDay() === 0;
}

export function addDays(weekStart: string, days: number): string {
  const date = toUtcDate(weekStart);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The academy week in Israel right now. Friday and Saturday already belong to
 * the coming week, the same as the dates on the app's day chips.
 */
export function currentWeekStart(now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
  const weekday = toUtcDate(today).getUTCDay();
  return addDays(today, -weekday + (weekday >= 5 ? 7 : 0));
}

// ── Activities ───────────────────────────────────────────────────────────────

type ActivityInput = {
  day: WeekDay;
  slot?: ScheduleSlot;
  name?: string | null;
  description?: string | null;
  emoji?: string;
  startTime: string;
  durationMinutes?: number;
  accentColor?: string | null;
};

/** What a template keeps of an activity: the plan, nothing tied to one week. */
export type TemplateActivity = {
  slot: ScheduleSlot;
  name: string | null;
  description: string | null;
  emoji: string;
  startTime: string;
  durationMinutes: number;
  accentColor: string | null;
};

type Db = Prisma.TransactionClient | typeof prisma;

const ORDER: Prisma.ScheduleActivityOrderByWithRelationInput[] = [{ day: "asc" }, { startTime: "asc" }];

/**
 * The activities a week shows: its own rows if it was edited; otherwise the
 * latest earlier week that was, so an edit carries forward like the old
 * single timetable did; otherwise the default week.
 */
async function resolveWith(db: Db, weekStart: string): Promise<ScheduleActivity[]> {
  const own = await db.scheduleActivity.findMany({ where: { weekStart }, orderBy: ORDER });
  if (own.length > 0) return own;

  const earlier = await db.scheduleActivity.findFirst({
    where: { weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
    select: { weekStart: true },
  });
  return db.scheduleActivity.findMany({
    where: { weekStart: earlier?.weekStart ?? null },
    orderBy: ORDER,
  });
}

/** One admin at a time changes a given week, so two first edits can't both copy it. */
async function lockWeek(tx: Prisma.TransactionClient, weekStart: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`schedule:${weekStart}`}))`;
}

function copyOf(activity: TemplateActivity & { day: WeekDay }, weekStart: string) {
  return {
    id: randomUUID(),
    day: activity.day,
    slot: activity.slot,
    name: activity.name,
    description: activity.description,
    emoji: activity.emoji,
    startTime: activity.startTime,
    durationMinutes: activity.durationMinutes,
    accentColor: activity.accentColor,
    weekStart,
  };
}

/**
 * Gives a week its own rows before its first edit, copied from whatever it
 * shows today, so the edit can never reach any other week. Returns the
 * source-id → copy-id map, or null when the week already had its own rows.
 */
async function ownWeek(tx: Prisma.TransactionClient, weekStart: string): Promise<Map<string, string> | null> {
  await lockWeek(tx, weekStart);
  const own = await tx.scheduleActivity.count({ where: { weekStart } });
  if (own > 0) return null;

  const source = await resolveWith(tx, weekStart);
  const copies = source.map((activity) => copyOf(activity, weekStart));
  await tx.scheduleActivity.createMany({ data: copies });
  return new Map(source.map((activity, index) => [activity.id, copies[index].id]));
}

/** The row in this week an edit aimed at, even if the app still holds the source's id. */
async function targetIn(tx: Prisma.TransactionClient, weekStart: string, id: string): Promise<string | null> {
  const copied = await ownWeek(tx, weekStart);
  const target = copied?.get(id) ?? id;
  const row = await tx.scheduleActivity.findUnique({ where: { id: target }, select: { weekStart: true } });
  return row?.weekStart === weekStart ? target : null;
}

// ── Templates ────────────────────────────────────────────────────────────────

export type TemplateDays = Record<WeekDay, TemplateActivity[]>;

function toTemplateDays(activities: ScheduleActivity[]): TemplateDays {
  const days = Object.fromEntries(WEEK_DAYS.map((day) => [day, [] as TemplateActivity[]])) as TemplateDays;
  for (const activity of activities) {
    days[activity.day]?.push({
      slot: activity.slot,
      name: activity.name,
      description: activity.description,
      emoji: activity.emoji,
      startTime: activity.startTime,
      durationMinutes: activity.durationMinutes,
      accentColor: activity.accentColor,
    });
  }
  return days;
}

export const ScheduleModel = {
  resolveWeek(weekStart: string): Promise<ScheduleActivity[]> {
    return resolveWith(prisma, weekStart);
  },

  async create(weekStart: string, input: ActivityInput): Promise<ScheduleActivity> {
    return prisma.$transaction(async (tx) => {
      await ownWeek(tx, weekStart);
      return tx.scheduleActivity.create({
        data: {
          day: input.day,
          // Older app builds send no slot; their activities still need one.
          slot: input.slot ?? slotForTime(input.startTime),
          name: input.name?.trim() || null,
          description: input.description?.trim() || null,
          emoji: input.emoji?.trim() || "🌟",
          startTime: input.startTime,
          durationMinutes: input.durationMinutes ?? 30,
          accentColor: input.accentColor ?? null,
          weekStart,
        },
      });
    });
  },

  async update(weekStart: string, id: string, input: Partial<ActivityInput>): Promise<ScheduleActivity | null> {
    return prisma.$transaction(async (tx) => {
      const target = await targetIn(tx, weekStart, id);
      if (!target) return null;
      return tx.scheduleActivity.update({
        where: { id: target },
        data: {
          ...(input.day !== undefined ? { day: input.day } : {}),
          ...(input.slot !== undefined ? { slot: input.slot } : {}),
          ...(input.name !== undefined ? { name: input.name?.trim() || null } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.emoji !== undefined ? { emoji: input.emoji || "🌟" } : {}),
          ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
          ...(input.durationMinutes !== undefined
            ? { durationMinutes: input.durationMinutes }
            : {}),
          ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
        },
      });
    });
  },

  async remove(weekStart: string, id: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const target = await targetIn(tx, weekStart, id);
      if (!target) return false;
      await tx.scheduleActivity.delete({ where: { id: target } });
      return true;
    });
  },

  listTemplates() {
    return prisma.weekTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, sourceWeekStart: true, createdAt: true },
    });
  },

  /** Null when the week has nothing in it — an empty template is no use. */
  async saveTemplate(name: string, weekStart: string, createdBy: string): Promise<WeekTemplate | null> {
    const activities = await resolveWith(prisma, weekStart);
    if (activities.length === 0) return null;
    return prisma.weekTemplate.create({
      data: {
        name,
        days: toTemplateDays(activities) as unknown as Prisma.InputJsonValue,
        sourceWeekStart: weekStart,
        createdBy,
      },
    });
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const { count } = await prisma.weekTemplate.deleteMany({ where: { id } });
    return count > 0;
  },

  /** Replaces the week with the template, all or nothing, and records it. */
  async applyTemplate(id: string, weekStart: string): Promise<ScheduleActivity[] | null> {
    const template = await prisma.weekTemplate.findUnique({ where: { id } });
    if (!template) return null;
    const days = template.days as unknown as TemplateDays;

    await prisma.$transaction(async (tx) => {
      await lockWeek(tx, weekStart);
      await tx.scheduleActivity.deleteMany({ where: { weekStart } });
      await tx.scheduleActivity.createMany({
        data: WEEK_DAYS.flatMap((day) => (days[day] ?? []).map((activity) => copyOf({ ...activity, day }, weekStart))),
      });
      await tx.templateApplication.create({ data: { templateId: id, weekStart } });
    });
    return resolveWith(prisma, weekStart);
  },

  /**
   * A template applied to the same week last year: a week within ±7 days of
   * 52 weeks back, the closest one winning. Nothing if the admin closed the
   * suggestion for this week, or the template is already on it.
   */
  async suggestion(weekStart: string): Promise<{ templateId: string; name: string } | null> {
    const dismissed = await prisma.scheduleSuggestionDismissal.findUnique({ where: { weekStart } });
    if (dismissed) return null;

    const target = addDays(weekStart, -364);
    const applications = await prisma.templateApplication.findMany({
      where: { weekStart: { gte: addDays(weekStart, -371), lte: addDays(weekStart, -357) } },
      orderBy: { appliedAt: "desc" },
    });
    const templates = await prisma.weekTemplate.findMany({
      where: { id: { in: applications.map((application) => application.templateId) } },
      select: { id: true, name: true },
    });
    const live = new Map(templates.map((template) => [template.id, template.name]));

    const distance = (week: string) => Math.abs(toUtcDate(week).getTime() - toUtcDate(target).getTime());
    const best = applications
      .filter((application) => live.has(application.templateId))
      .sort((a, b) => distance(a.weekStart) - distance(b.weekStart))[0];
    if (!best) return null;

    const alreadyApplied = await prisma.templateApplication.findFirst({
      where: { templateId: best.templateId, weekStart },
    });
    if (alreadyApplied) return null;
    return { templateId: best.templateId, name: live.get(best.templateId)! };
  },

  async dismissSuggestion(weekStart: string): Promise<void> {
    await prisma.scheduleSuggestionDismissal.upsert({
      where: { weekStart },
      create: { weekStart },
      update: {},
    });
  },
};
