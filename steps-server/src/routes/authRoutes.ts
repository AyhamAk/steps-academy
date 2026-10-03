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
import {
  registerWithPhone,
  startPhoneSignIn,
  verifyPhoneSignIn,
} from "../controllers/phoneAuthController";
import { requireAuth } from "../middleware/auth";
import { authRateLimit, phoneIpRateLimit, phoneNumberRateLimit } from "../middleware/rateLimit";

const router = Router();

// Public on purpose: someone holding a code has no account yet. Rate-limited
// so it can't be used to sweep for valid codes.
router.post("/invite/check", authRateLimit, checkInvite);
router.post("/register", authRateLimit, register);
// Phone sign-in: limited per number and, loosely, per IP — see rateLimit.ts.
// phoneCodes caps paid sends per number on top.
router.post("/phone/start", phoneNumberRateLimit, phoneIpRateLimit, startPhoneSignIn);
router.post("/phone/verify", phoneNumberRateLimit, phoneIpRateLimit, verifyPhoneSignIn);
router.post("/phone/register", phoneIpRateLimit, registerWithPhone);
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
