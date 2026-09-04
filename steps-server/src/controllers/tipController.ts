import { Request, Response } from "express";

import { TipModel } from "../models/tip";

function param(req: Request, key: string): string {
  return (req.params as Record<string, string>)[key];
}

const MAX_TITLE = 200;
const MAX_EXCERPT = 400;
const MAX_BODY = 20000;

/**
 * Shared validation for create and update.
 *
 * `requireCore` is on for create, where title, body and a month must all be
 * present, and off for update, where any subset may be sent.
 */
function validateTip(body: Record<string, unknown>, requireCore: boolean): string | null {
  const text = (key: string, max: number, required: boolean): string | null => {
    const value = body[key];
    if (value === undefined || value === null) {
      return required ? `${key} is required` : null;
    }
    if (typeof value !== "string") return `${key} must be text`;
    if (required && !value.trim()) return `${key} is required`;
    if (value.length > max) return `${key} must be ${max} characters or fewer`;
    return null;
  };

  const checks = [
    text("title", MAX_TITLE, requireCore),
    text("titleAr", MAX_TITLE, false),
    text("titleHe", MAX_TITLE, false),
    text("excerpt", MAX_EXCERPT, false),
    text("excerptAr", MAX_EXCERPT, false),
    text("excerptHe", MAX_EXCERPT, false),
    text("body", MAX_BODY, requireCore),
    text("bodyAr", MAX_BODY, false),
    text("bodyHe", MAX_BODY, false),
  ];
  for (const error of checks) if (error) return error;

  // Month is 1-12 as a human writes it, not a JS month index — the API is
  // read by people as well as by the app.
  const { month, year, minutes } = body as {
    month?: unknown;
    year?: unknown;
    minutes?: unknown;
  };
  if (month === undefined ? requireCore : true) {
    if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) {
      return "month must be a whole number from 1 to 12";
    }
  }
  if (year === undefined ? requireCore : true) {
    if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return "year must be a whole number between 2000 and 2100";
    }
  }
  if (minutes !== undefined) {
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      return "minutes must be a whole number from 1 to 120";
    }
  }
  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean") {
    return "isPublished must be true or false";
  }
  return null;
}

/** Parents: published tips only, each flagged with whether they have read it. */
export async function listTips(req: Request, res: Response) {
  const tips = await TipModel.listPublished(req.userId!);
  res.json({ tips });
}

/** Admins: everything, drafts included. */
export async function listAllTips(_req: Request, res: Response) {
  const tips = await TipModel.listAll();
  res.json({ tips });
}

export async function createTip(req: Request, res: Response) {
  const error = validateTip(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const tip = await TipModel.create({ ...req.body, createdBy: req.userId! });
  res.status(201).json({ tip });
}

export async function updateTip(req: Request, res: Response) {
  const error = validateTip(req.body, false);
  if (error) return res.status(400).json({ message: error });

  const tip = await TipModel.update(param(req, "tipId"), req.body);
  if (!tip) return res.status(404).json({ message: "Tip not found" });
  res.json({ tip });
}

export async function deleteTip(req: Request, res: Response) {
  const removed = await TipModel.remove(param(req, "tipId"));
  if (!removed) return res.status(404).json({ message: "Tip not found" });
  res.status(204).end();
}

/**
 * Marking read is deliberately not gated on the tip being published: a draft
 * an admin opens is theirs to read, and a 403 here would be noise.
 */
export async function markTipRead(req: Request, res: Response) {
  const tipId = param(req, "tipId");
  const tip = await TipModel.findById(tipId);
  if (!tip) return res.status(404).json({ message: "Tip not found" });

  await TipModel.markRead(tipId, req.userId!);
  res.status(204).end();
}
