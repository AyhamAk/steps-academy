import express, { Router } from "express";

import {
  albumPage,
  contentPage,
  createActivity,
  createAlbum,
  createTip,
  deleteActivity,
  deleteAlbum,
  deleteTip,
  postAnnouncement,
  publishAlbum,
  saveQuote,
  tipPage,
  updateAlbum,
  updateTip,
} from "../dashboard/content";
import {
  courseDeletePage,
  courseDetailPage,
  coursesPage,
  createCourse,
  decideEnrollment,
  deleteCourse,
  updateCourse,
} from "../dashboard/courses";
import { sqlPage } from "../dashboard/sql";
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  issueInvite,
  linkGuardian,
  revokeInvite,
  studentDeletePage,
  studentDetailPage,
  studentsPage,
  unlinkGuardian,
  updateStudent,
} from "../dashboard/students";
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

// Every write re-checks the admin role and a per-admin CSRF token: the browser
// replays Basic credentials on cross-site posts, so the gate above is not
// enough on its own.

// -- users
router.get("/users", usersPage);
router.get("/users/:userId", userDetailPage);
router.get("/users/:userId/delete", userDeletePage);
router.post("/users/:userId/role", requireCsrf, setUserRole);
router.post("/users/:userId/link", requireCsrf, linkChild);
router.post("/users/:userId/unlink", requireCsrf, unlinkChild);
router.post("/users/:userId/reassign", requireCsrf, reassignContent);
router.post("/users/:userId/delete", requireCsrf, deleteUser);

// -- students
router.get("/students", studentsPage);
router.post("/students/new", requireCsrf, createStudent);
router.post("/students/bulk", requireCsrf, bulkCreateStudents);
router.get("/students/:studentId", studentDetailPage);
router.get("/students/:studentId/delete", studentDeletePage);
router.post("/students/:studentId/edit", requireCsrf, updateStudent);
router.post("/students/:studentId/link", requireCsrf, linkGuardian);
router.post("/students/:studentId/unlink", requireCsrf, unlinkGuardian);
router.post("/students/:studentId/codes", requireCsrf, issueInvite);
router.post("/students/:studentId/codes/:codeId/revoke", requireCsrf, revokeInvite);
router.post("/students/:studentId/delete", requireCsrf, deleteStudent);

// -- courses
router.get("/courses", coursesPage);
router.post("/courses/new", requireCsrf, createCourse);
router.post("/courses/enrollments/:enrollmentId/decide", requireCsrf, decideEnrollment);
router.get("/courses/:courseId", courseDetailPage);
router.get("/courses/:courseId/delete", courseDeletePage);
router.post("/courses/:courseId/edit", requireCsrf, updateCourse);
router.post("/courses/:courseId/delete", requireCsrf, deleteCourse);

// -- content
router.get("/content", contentPage);
router.post("/content/albums", requireCsrf, createAlbum);
router.post("/content/announcements", requireCsrf, postAnnouncement);
router.post("/content/quote", requireCsrf, saveQuote);
router.post("/content/schedule", requireCsrf, createActivity);
router.post("/content/schedule/:activityId/delete", requireCsrf, deleteActivity);
router.get("/content/albums/:eventId", albumPage);
router.post("/content/albums/:eventId/edit", requireCsrf, updateAlbum);
router.post("/content/albums/:eventId/publish", requireCsrf, publishAlbum);
router.post("/content/albums/:eventId/delete", requireCsrf, deleteAlbum);
router.post("/content/tips", requireCsrf, createTip);
router.get("/content/tips/:tipId", tipPage);
router.post("/content/tips/:tipId/edit", requireCsrf, updateTip);
router.post("/content/tips/:tipId/delete", requireCsrf, deleteTip);

// -- sql (a GET renders the empty console, a POST runs a query and re-renders)
router.get("/sql", sqlPage);
router.post("/sql", requireCsrf, sqlPage);

export default router;
