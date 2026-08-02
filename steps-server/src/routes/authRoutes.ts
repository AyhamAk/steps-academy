import { Router } from "express";

import { googleAuth, login, logout, me, register, updateMe } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.post("/logout", requireAuth, logout);

export default router;
