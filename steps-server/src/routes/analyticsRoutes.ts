import { Router } from "express";

import { ingestEvents } from "../controllers/analyticsController";
import { optionalAuth } from "../middleware/auth";
import { analyticsRateLimit } from "../middleware/rateLimit";

const router = Router();

// optionalAuth, not requireAuth: the pre-login funnel is exactly the part
// worth measuring, and it must keep working when auth is on.
router.post("/events", analyticsRateLimit, optionalAuth, ingestEvents);

export default router;
