import { Router } from "express";

import {
  addMyChild,
  adminOverview,
  bulkCreateStudents,
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

// The one parent route: add a child of your own. It creates a new record
// linked only to the caller, so it can never reach another family's child —
// and a new record has no photo tags, so it reveals nothing.
router.post("/mine", requireAuth, addMyChild);

// Everything else is admin-only: linking a parent to an existing record is
// what decides who sees which photos.
router.get("/", requireAuth, adminOnly, listStudents);
router.post("/", requireAuth, adminOnly, createStudent);
router.post("/bulk", requireAuth, adminOnly, bulkCreateStudents);
router.patch("/:studentId", requireAuth, adminOnly, updateStudent);
router.delete("/:studentId", requireAuth, adminOnly, deleteStudent);

router.post("/:studentId/guardians", requireAuth, adminOnly, linkGuardian);
router.delete("/:studentId/guardians/:parentId", requireAuth, adminOnly, unlinkGuardian);

router.get("/parents/all", requireAuth, adminOnly, listParents);
router.get("/overview", requireAuth, adminOnly, adminOverview);
router.get("/awaiting-link", requireAuth, adminOnly, listAwaitingLink);

export default router;
