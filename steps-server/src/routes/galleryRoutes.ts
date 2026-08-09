import { Router } from "express";

import {
  addTag,
  createEvent,
  deleteEvent,
  deletePhoto,
  getNextEvent,
  listEventPhotos,
  listEvents,
  myEventGallery,
  myGallery,
  removeTag,
  updateEventAttendees,
  updateEventCaption,
  uploadPhotos,
} from "../controllers/galleryController";
import { adminOnly, requireAuth } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post("/events", requireAuth, adminOnly, createEvent);
router.get("/events", requireAuth, listEvents);
router.get("/events/next", requireAuth, getNextEvent);
router.delete("/events/:eventId", requireAuth, adminOnly, deleteEvent);
router.post(
  "/events/:eventId/photos",
  requireAuth,
  adminOnly,
  upload.array("photos", 20),
  uploadPhotos
);
router.get("/events/:eventId/photos", requireAuth, adminOnly, listEventPhotos);
router.patch("/events/:eventId/caption", requireAuth, adminOnly, updateEventCaption);
router.patch("/events/:eventId/attendees", requireAuth, adminOnly, updateEventAttendees);

router.delete("/photos/:photoId", requireAuth, adminOnly, deletePhoto);
router.post("/photos/:photoId/tags", requireAuth, adminOnly, addTag);
router.delete("/photos/:photoId/tags/:tagId", requireAuth, adminOnly, removeTag);

// Parent-facing. Both resolve visibility through parent-student links, so a
// parent can only ever receive photos of children they're a guardian of.
router.get("/me", requireAuth, myGallery);
router.get("/me/:eventId", requireAuth, myEventGallery);

export default router;
