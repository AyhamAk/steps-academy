import { Request, Response } from "express";

import {
  currentWeekStart,
  isScheduleSlot,
  isWeekDay,
  isWeekStart,
  ScheduleActivity,
  ScheduleModel,
  WEEK_DAYS,
} from "../models/schedule";

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

function groupByDay(activities: ScheduleActivity[]) {
  // Grouped server-side so every client renders the same shape, including
  // days that are deliberately empty.
  return WEEK_DAYS.map((day) => ({
    day,
    activities: activities.filter((activity) => activity.day === day).map(serialize),
  }));
}

/**
 * The week a request is about. Older app builds send none, so they read and
 * edit the current week, which is what they always showed.
 */
function weekOf(req: Request): string | null {
  const raw = req.query.weekStart ?? req.body?.weekStart;
  if (raw === undefined || raw === "") return currentWeekStart();
  return isWeekStart(raw) ? raw : null;
}

const BAD_WEEK = { message: "weekStart must be a Sunday as YYYY-MM-DD" };

/** Everyone reads the timetable; only admins change it. */
export async function getWeek(req: Request, res: Response) {
  const weekStart = weekOf(req);
  if (!weekStart) return res.status(400).json(BAD_WEEK);
  const activities = await ScheduleModel.resolveWeek(weekStart);
  res.json({ weekStart, days: groupByDay(activities) });
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
  const weekStart = weekOf(req);
  if (!weekStart) return res.status(400).json(BAD_WEEK);
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const activity = await ScheduleModel.create(weekStart, req.body);
  res.status(201).json({ activity: serialize(activity) });
}

export async function updateActivity(req: Request, res: Response) {
  const weekStart = weekOf(req);
  if (!weekStart) return res.status(400).json(BAD_WEEK);
  const error = validate(req.body, false);
  if (error) return res.status(400).json({ message: error });

  const activity = await ScheduleModel.update(weekStart, param(req, "activityId"), req.body);
  if (!activity) return res.status(404).json({ message: "Activity not found" });
  res.json({ activity: serialize(activity) });
}

export async function deleteActivity(req: Request, res: Response) {
  const weekStart = weekOf(req);
  if (!weekStart) return res.status(400).json(BAD_WEEK);
  const removed = await ScheduleModel.remove(weekStart, param(req, "activityId"));
  if (!removed) return res.status(404).json({ message: "Activity not found" });
  res.json({ message: "Activity deleted" });
}

// ── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(_req: Request, res: Response) {
  res.json({ templates: await ScheduleModel.listTemplates() });
}

export async function saveTemplate(req: Request, res: Response) {
  const weekStart = req.body?.weekStart;
  if (!isWeekStart(weekStart)) return res.status(400).json(BAD_WEEK);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (name.length < 1 || name.length > 40) {
    return res.status(400).json({ message: "name must be 1 to 40 characters" });
  }

  const template = await ScheduleModel.saveTemplate(name, weekStart, req.userId!);
  if (!template) return res.status(400).json({ message: "This week has no activities to save" });
  res.status(201).json({
    template: {
      id: template.id,
      name: template.name,
      sourceWeekStart: template.sourceWeekStart,
      createdAt: template.createdAt,
    },
  });
}

export async function deleteTemplate(req: Request, res: Response) {
  const removed = await ScheduleModel.deleteTemplate(param(req, "templateId"));
  if (!removed) return res.status(404).json({ message: "Template not found" });
  res.json({ message: "Template deleted" });
}

export async function applyTemplate(req: Request, res: Response) {
  const weekStart = req.body?.weekStart;
  if (!isWeekStart(weekStart)) return res.status(400).json(BAD_WEEK);
  const activities = await ScheduleModel.applyTemplate(param(req, "templateId"), weekStart);
  if (!activities) return res.status(404).json({ message: "Template not found" });
  res.json({ weekStart, days: groupByDay(activities) });
}

export async function getSuggestion(req: Request, res: Response) {
  const weekStart = req.query.weekStart;
  if (!isWeekStart(weekStart)) return res.status(400).json(BAD_WEEK);
  res.json({ suggestion: await ScheduleModel.suggestion(weekStart) });
}

export async function dismissSuggestion(req: Request, res: Response) {
  const weekStart = req.body?.weekStart;
  if (!isWeekStart(weekStart)) return res.status(400).json(BAD_WEEK);
  await ScheduleModel.dismissSuggestion(weekStart);
  res.json({ message: "Suggestion dismissed" });
}
