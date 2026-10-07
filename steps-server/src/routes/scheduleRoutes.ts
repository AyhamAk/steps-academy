import { Router } from "express";

import {
  createActivity,
  deleteActivity,
  getWeek,
  updateActivity,
} from "../controllers/scheduleController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Parents read the timetable; only the academy edits it.
router.get("/", requireAuth, getWeek);
router.post("/", requireAuth, adminOnly, createActivity);
router.patch("/:activityId", requireAuth, adminOnly, updateActivity);
router.delete("/:activityId", requireAuth, adminOnly, deleteActivity);

export default router;
