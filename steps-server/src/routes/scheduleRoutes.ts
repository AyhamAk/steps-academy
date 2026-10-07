import { Router } from "express";

import {
  createActivity,
  deleteActivity,
  getSlotDescriptions,
  getWeek,
  setSlotDescriptions,
  updateActivity,
} from "../controllers/scheduleController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Parents read the timetable; only the academy edits it.
router.get("/", requireAuth, getWeek);
// Before /:activityId, so "slot-descriptions" is never read as an id.
router.get("/slot-descriptions", requireAuth, getSlotDescriptions);
router.put("/slot-descriptions", requireAuth, adminOnly, setSlotDescriptions);
router.post("/", requireAuth, adminOnly, createActivity);
router.patch("/:activityId", requireAuth, adminOnly, updateActivity);
router.delete("/:activityId", requireAuth, adminOnly, deleteActivity);

export default router;
