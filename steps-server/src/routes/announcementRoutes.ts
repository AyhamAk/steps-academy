import { Router } from "express";

import { createAnnouncement, getLatestAnnouncement } from "../controllers/announcementController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, adminOnly, createAnnouncement);
router.get("/latest", requireAuth, getLatestAnnouncement);

export default router;
