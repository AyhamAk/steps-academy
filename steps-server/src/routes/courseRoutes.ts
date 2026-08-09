import { Router } from "express";

import {
  cancelEnrollment,
  createCourse,
  decideEnrollment,
  deleteCourse,
  enrollmentSummary,
  listCourses,
  listEnrollments,
  requestEnrollment,
  updateCourse,
} from "../controllers/courseController";
import { adminOnly, requireAuth } from "../middleware/auth";

const router = Router();

// Enrolment routes come before /:courseId so "enrollments" isn't captured as an id.
router.get("/enrollments", requireAuth, adminOnly, listEnrollments);
router.get("/enrollments/summary", requireAuth, adminOnly, enrollmentSummary);
router.patch("/enrollments/:enrollmentId", requireAuth, adminOnly, decideEnrollment);
router.delete("/enrollments/:enrollmentId", requireAuth, cancelEnrollment);

router.get("/", requireAuth, listCourses);
router.post("/", requireAuth, adminOnly, createCourse);
router.patch("/:courseId", requireAuth, adminOnly, updateCourse);
router.delete("/:courseId", requireAuth, adminOnly, deleteCourse);

// Parents request for their own children; the request lands as pending.
router.post("/:courseId/enroll", requireAuth, requestEnrollment);

export default router;
