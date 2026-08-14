import { Router } from "express";

import {
  createInvite,
  listInvites,
  redeemInvite,
  revokeInvite,
} from "../controllers/inviteController";
import { adminOnly, requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";

const router = Router();

// Creating and revoking invites is how access to a child's photos is granted,
// so it sits behind the same admin-only bar as the student roster itself.
router.post("/", requireAuth, adminOnly, createInvite);
router.get("/", requireAuth, adminOnly, listInvites);
router.delete("/:inviteId", requireAuth, adminOnly, revokeInvite);

// A logged-in parent adding a second child. Rate-limited like the auth routes:
// it takes a guessable code and turns it into access, so it deserves the same
// protection as a login attempt.
router.post("/redeem", authRateLimit, requireAuth, redeemInvite);

export default router;
