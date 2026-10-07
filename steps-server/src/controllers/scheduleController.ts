import { Request, Response } from "express";

import { isScheduleSlot, isWeekDay, ScheduleActivity, ScheduleModel, WEEK_DAYS } from "../models/schedule";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** "HH:MM", 24-hour. Stored this way so a day sorts without parsing. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function serialize(activity: ScheduleActivity) {
  return {
    id: activity.id,
    day: activity.day,
    slot: activity.slot,
    name: activity.name,
    description: activity.description,
    emoji: activity.emoji,
    startTime: activity.startTime,
    durationMinutes: activity.durationMinutes,
    accentColor: activity.accentColor,
  };
}

/** Everyone reads the timetable; only admins change it. */
export async function getWeek(_req: Request, res: Response) {
  const activities = await ScheduleModel.listWeek();
  // Grouped server-side so every client renders the same shape, including
  // days that are deliberately empty.
  const days = WEEK_DAYS.map((day) => ({
    day,
    activities: activities.filter((activity) => activity.day === day).map(serialize),
  }));
  res.json({ days });
}

function validate(body: Record<string, unknown>, requireAll: boolean) {
  if (requireAll || body.day !== undefined) {
    if (!isWeekDay(body.day)) return "day must be one of sun, mon, tue, wed, thu";
  }
  // No slot means an older app build; the model picks one from the start time.
  if (body.slot !== undefined && !isScheduleSlot(body.slot)) {
    return "slot must be one of reception, breakfast, prepAndFreeChoice, dailyActivity, storyOrCircle, lunch, napTime, freePlayAndTalk";
  }
  // Optional: an activity with no name of its own shows its slot's name.
  if (body.name !== undefined && body.name !== null && typeof body.name !== "string") {
    return "name must be text";
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") return "description must be text";
    if (body.description.length > 600) return "description must be 600 characters or fewer";
  }
  if (requireAll || body.startTime !== undefined) {
    if (typeof body.startTime !== "string" || !TIME_PATTERN.test(body.startTime)) {
      return "startTime must be in 24-hour HH:MM format";
    }
  }
  if (body.durationMinutes !== undefined) {
    const minutes = Number(body.durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      return "durationMinutes must be between 1 and 600";
    }
  }
  return null;
}

export async function createActivity(req: Request, res: Response) {
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const activity = await ScheduleModel.create(req.body);
  res.status(201).json({ activity: serialize(activity) });
}

export async function updateActivity(req: Request, res: Response) {
  const error = validate(req.body, false);
  if (error) return res.status(400).json({ message: error });

  const activity = await ScheduleModel.update(param(req, "activityId"), req.body);
  if (!activity) return res.status(404).json({ message: "Activity not found" });
  res.json({ activity: serialize(activity) });
}

export async function deleteActivity(req: Request, res: Response) {
  const removed = await ScheduleModel.remove(param(req, "activityId"));
  if (!removed) return res.status(404).json({ message: "Activity not found" });
  res.json({ message: "Activity deleted" });
}
