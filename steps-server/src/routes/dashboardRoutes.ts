import { Router } from "express";

import { dashboard } from "../controllers/dashboardController";
import { dashboardAuth } from "../middleware/dashboardAuth";

const router = Router();

// Basic auth against the admin accounts; nothing here is reachable otherwise.
router.get("/", dashboardAuth, dashboard);

export default router;
