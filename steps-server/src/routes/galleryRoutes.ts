import { Router } from "express";

import {
  addTag,
  createEvent,
  getNextEvent,
  listEventPhotos,
  listEvents,
  listStudents,
  myEventGallery,
  myGallery,
  removeTag,
  uploadPhotos,
} from "../controllers/galleryController";
import { adminOnly, requireAuth } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post("/events", requireAuth, adminOnly, createEvent);
router.get("/events", requireAuth, listEvents);
router.get("/events/next", requireAuth, getNextEvent);
router.post(
  "/events/:eventId/photos",
  requireAuth,
  adminOnly,
  upload.array("photos", 20),
  uploadPhotos
);
router.get("/events/:eventId/photos", requireAuth, adminOnly, listEventPhotos);

router.post("/photos/:photoId/tags", requireAuth, adminOnly, addTag);
router.delete("/photos/:photoId/tags/:tagId", requireAuth, adminOnly, removeTag);

router.get("/students", requireAuth, adminOnly, listStudents);

router.get("/me", requireAuth, myGallery);
router.get("/me/:eventId", requireAuth, myEventGallery);

export default router;
