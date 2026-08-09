import { ScheduleActivity as PrismaScheduleActivity, WeekDay } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type ScheduleActivity = PrismaScheduleActivity;
export type { WeekDay };

export const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu"];

export function isWeekDay(value: unknown): value is WeekDay {
  return typeof value === "string" && (WEEK_DAYS as string[]).includes(value);
}

type ActivityInput = {
  day: WeekDay;
  name: string;
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
        name: input.name.trim(),
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
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
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
