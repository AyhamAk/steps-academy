import { Router } from "express";

import {
  changePassword,
  googleAuth,
  login,
  logout,
  me,
  register,
  updateMe,
  updatePushToken,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";

const router = Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/google", authRateLimit, googleAuth);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.patch("/password", requireAuth, changePassword);
router.patch("/push-token", requireAuth, updatePushToken);
router.post("/logout", requireAuth, logout);

export default router;
