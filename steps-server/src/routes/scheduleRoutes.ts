import { Router } from "express";

import {
  applyTemplate,
  createActivity,
  deleteActivity,
  deleteTemplate,
  dismissSuggestion,
  getSuggestion,
  getWeek,
  listTemplates,
  saveTemplate,
  updateActivity,
} from "../controllers/scheduleController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Saved weeks, shared by every admin.
router.get("/templates", requireAuth, adminOnly, listTemplates);
router.post("/templates", requireAuth, adminOnly, saveTemplate);
router.get("/templates/suggestion", requireAuth, adminOnly, getSuggestion);
router.post("/templates/suggestion/dismiss", requireAuth, adminOnly, dismissSuggestion);
router.delete("/templates/:templateId", requireAuth, adminOnly, deleteTemplate);
router.post("/templates/:templateId/apply", requireAuth, adminOnly, applyTemplate);

// Parents read the timetable; only the academy edits it. Each call is about
// one week (?weekStart=YYYY-MM-DD), the current one when none is given.
router.get("/", requireAuth, getWeek);
router.post("/", requireAuth, adminOnly, createActivity);
router.patch("/:activityId", requireAuth, adminOnly, updateActivity);
router.delete("/:activityId", requireAuth, adminOnly, deleteActivity);

export default router;
