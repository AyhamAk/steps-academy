import { Router } from "express";

import {
  changePassword,
  deleteAccount,
  googleAuth,
  login,
  logout,
  me,
  register,
  updateMe,
  updateLocale,
  updatePushToken,
} from "../controllers/authController";
import { checkInvite } from "../controllers/inviteController";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";

const router = Router();

// Public on purpose: someone holding a code has no account yet. Rate-limited
// so it can't be used to sweep for valid codes.
router.post("/invite/check", authRateLimit, checkInvite);
router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/google", authRateLimit, googleAuth);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.delete("/me", requireAuth, deleteAccount);
router.patch("/password", requireAuth, changePassword);
router.patch("/push-token", requireAuth, updatePushToken);
router.patch("/locale", requireAuth, updateLocale);
router.post("/logout", requireAuth, logout);

export default router;
