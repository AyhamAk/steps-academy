import { ScheduleActivity as PrismaScheduleActivity, ScheduleSlot, WeekDay } from "@prisma/client";

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
  "storyOrCircle",
  "lunch",
  "napTime",
  "freePlayAndTalk",
];

export function isScheduleSlot(value: unknown): value is ScheduleSlot {
  return typeof value === "string" && (SCHEDULE_SLOTS as string[]).includes(value);
}

/** The slot an activity starting at this time most likely belongs to. Lunch is never guessed. */
export function slotForTime(startTime: string): ScheduleSlot {
  if (startTime < "09:00") return "reception";
  if (startTime < "09:30") return "breakfast";
  if (startTime < "10:00") return "prepAndFreeChoice";
  if (startTime < "11:15") return "dailyActivity";
  if (startTime < "12:15") return "storyOrCircle";
  if (startTime < "14:15") return "napTime";
  return "freePlayAndTalk";
}

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

export const ScheduleModel = {
  /** The whole week in one query, ordered so each day reads chronologically. */
  async listWeek(): Promise<ScheduleActivity[]> {
    return prisma.scheduleActivity.findMany({ orderBy: [{ day: "asc" }, { startTime: "asc" }] });
  },

  async findById(id: string): Promise<ScheduleActivity | null> {
    return prisma.scheduleActivity.findUnique({ where: { id } });
  },

  async create(input: ActivityInput): Promise<ScheduleActivity> {
    return prisma.scheduleActivity.create({
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
      },
    });
  },

  async update(id: string, input: Partial<ActivityInput>): Promise<ScheduleActivity | null> {
    try {
      return await prisma.scheduleActivity.update({
        where: { id },
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
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.scheduleActivity.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
