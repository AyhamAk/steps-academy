import bcrypt from "bcryptjs";

import { env } from "./config/env";
import { AnnouncementModel } from "./models/announcement";
import { EventModel } from "./models/event";
import { PhotoModel } from "./models/photo";
import { PhotoTagModel } from "./models/photoTag";
import { UserModel } from "./models/user";

/**
 * Dev-only demo seed. The backend is in-memory and wiped on every restart, so
 * this runs on startup to guarantee a realistic parent experience is always
 * available for testing in Expo Go — without hardcoding anything into the app.
 *
 * Log in as: sarah@steps.local / steps1234  (parent of "Layla")
 *
 * Idempotent: skips entirely if Sarah already exists, and never runs in prod.
 */
export async function runDevSeed(): Promise<void> {
  if (env.nodeEnv === "production") return;
  if (UserModel.findByEmail("sarah@steps.local")) return;

  const passwordHash = await bcrypt.hash("steps1234", 10);
  const sarah = UserModel.create({
    email: "sarah@steps.local",
    name: "Sarah",
    passwordHash,
    role: "parent",
    childNames: ["Layla"],
  });

  const artShow = EventModel.create({
    name: "Art Show",
    date: "2026-07-27",
    attendees: ["Layla", "Omar", "Sara", "Noor", "Yusuf", "Maya", "Adam", "Lina"],
    createdBy: sarah.id,
  });
  const summerSplash = EventModel.create({
    name: "Summer Splash",
    date: "2026-07-30",
    attendees: ["Layla", "Omar", "Sara"],
    createdBy: sarah.id,
  });
  // Future event with no photos — surfaces as "Next Event" on Home.
  EventModel.create({
    name: "Fall Festival",
    date: "2026-08-15",
    attendees: [],
    createdBy: sarah.id,
  });

  const addPhoto = (eventId: string, seed: string, taggedLayla: boolean) => {
    const photo = PhotoModel.create({
      eventId,
      filename: `${seed}.jpg`,
      url: `https://picsum.photos/seed/${seed}/600/600`,
      uploadedBy: sarah.id,
    });
    if (taggedLayla) PhotoTagModel.create(photo.id, "Layla");
  };

  // Art Show — 18 photos, Layla tagged in the odd-indexed ones (9 of Layla's).
  for (let i = 1; i <= 18; i++) addPhoto(artShow.id, `stepsart${i}`, i % 2 === 1);
  // Summer Splash — 5 photos, Layla tagged in the first 2.
  for (let i = 1; i <= 5; i++) addPhoto(summerSplash.id, `stepssplash${i}`, i <= 2);

  AnnouncementModel.create({
    text: "School closed next Friday for staff training. Have a wonderful long weekend! 🌟",
    createdBy: sarah.id,
  });

  console.log("[devSeed] Seeded parent account sarah@steps.local / steps1234 (child: Layla)");
}
