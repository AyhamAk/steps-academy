import { Router } from "express";

import { listFeedback, markFeedbackRead, submitFeedback } from "../controllers/feedbackController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, submitFeedback);
router.get("/", requireAuth, adminOnly, listFeedback);
router.patch("/read", requireAuth, adminOnly, markFeedbackRead);

export default router;
