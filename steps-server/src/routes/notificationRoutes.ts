import { Router } from "express";

import { listNotifications, markAllRead } from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.post("/read", requireAuth, markAllRead);

export default router;
