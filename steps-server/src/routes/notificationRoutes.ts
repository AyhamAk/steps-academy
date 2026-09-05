import { Router } from "express";

import { clearAll, listNotifications, markAllRead } from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.post("/read", requireAuth, markAllRead);
router.delete("/", requireAuth, clearAll);

export default router;
