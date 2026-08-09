import { Router } from "express";

import {
  adminOverview,
  createStudent,
  deleteStudent,
  linkGuardian,
  listAwaitingLink,
  listParents,
  listStudents,
  unlinkGuardian,
  updateStudent,
} from "../controllers/studentController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Student records decide who can see which photos, so every route here is
// admin-only — a parent must never be able to create or link one.
router.get("/", requireAuth, adminOnly, listStudents);
router.post("/", requireAuth, adminOnly, createStudent);
router.patch("/:studentId", requireAuth, adminOnly, updateStudent);
router.delete("/:studentId", requireAuth, adminOnly, deleteStudent);

router.post("/:studentId/guardians", requireAuth, adminOnly, linkGuardian);
router.delete("/:studentId/guardians/:parentId", requireAuth, adminOnly, unlinkGuardian);

router.get("/parents/all", requireAuth, adminOnly, listParents);
router.get("/overview", requireAuth, adminOnly, adminOverview);
router.get("/awaiting-link", requireAuth, adminOnly, listAwaitingLink);

export default router;
