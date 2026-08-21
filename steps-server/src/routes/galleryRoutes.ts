import { Router } from "express";

import {
  addTag,
  createEvent,
  deleteEvent,
  deletePhoto,
  getGalleryQuote,
  getNextEvent,
  listEventPhotos,
  listEvents,
  myEventGallery,
  myGallery,
  removeTag,
  setGalleryQuote,
  updateEvent,
  updateEventAttendees,
  updateEventCaption,
  publishEvent,
  uploadPhotos,
} from "../controllers/galleryController";
import { adminOnly, requireAuth } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// Quote routes come before /events/:id so "quote" isn't captured as an id.
router.get("/quote", requireAuth, getGalleryQuote);
router.put("/quote", requireAuth, adminOnly, setGalleryQuote);

router.post("/events", requireAuth, adminOnly, createEvent);
router.get("/events", requireAuth, listEvents);
router.get("/events/next", requireAuth, getNextEvent);
router.patch("/events/:eventId", requireAuth, adminOnly, updateEvent);
router.delete("/events/:eventId", requireAuth, adminOnly, deleteEvent);
router.post(
  "/events/:eventId/photos",
  requireAuth,
  adminOnly,
  upload.array("photos", 20),
  uploadPhotos
);
router.get("/events/:eventId/photos", requireAuth, adminOnly, listEventPhotos);
// Announcing a finished album is its own step - see publishEvent.
router.post("/events/:eventId/publish", requireAuth, adminOnly, publishEvent);
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
