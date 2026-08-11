import { Router } from "express";

import { listFeedback, submitFeedback } from "../controllers/feedbackController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, submitFeedback);
router.get("/", requireAuth, adminOnly, listFeedback);

export default router;
