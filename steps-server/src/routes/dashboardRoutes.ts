import express, { Router } from "express";

import { usagePage } from "../dashboard/usage";
import {
  deleteUser,
  linkChild,
  reassignContent,
  setUserRole,
  unlinkChild,
  userDeletePage,
  userDetailPage,
  usersPage,
} from "../dashboard/users";
import { dashboardAuth, requireCsrf } from "../middleware/dashboardAuth";
import { dashboardRateLimit } from "../middleware/rateLimit";

const router = Router();

// Form posts arrive urlencoded, and the API is deliberately JSON-only — so the
// parser is mounted here rather than globally.
router.use(express.urlencoded({ extended: false }));

// Basic auth against the admin accounts; nothing here is reachable otherwise.
router.use(dashboardRateLimit, dashboardAuth);

router.get("/", usagePage);

router.get("/users", usersPage);
router.get("/users/:userId", userDetailPage);
router.get("/users/:userId/delete", userDeletePage);

// Every write re-checks the admin role and a per-admin CSRF token: the browser
// replays Basic credentials on cross-site posts, so the gate above is not
// enough on its own.
router.post("/users/:userId/role", requireCsrf, setUserRole);
router.post("/users/:userId/link", requireCsrf, linkChild);
router.post("/users/:userId/unlink", requireCsrf, unlinkChild);
router.post("/users/:userId/reassign", requireCsrf, reassignContent);
router.post("/users/:userId/delete", requireCsrf, deleteUser);

export default router;
