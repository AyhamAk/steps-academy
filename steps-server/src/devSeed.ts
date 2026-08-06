import bcrypt from "bcryptjs";

import { env } from "./config/env";
import { AnnouncementModel } from "./models/announcement";
import { EventModel } from "./models/event";
import { NotificationModel } from "./models/notification";
import { PhotoModel } from "./models/photo";
import { PhotoTagModel } from "./models/photoTag";
import { UserModel } from "./models/user";

/**
 * Dev-only demo seed. Runs on startup so a realistic parent experience is
 * always available for testing in Expo Go — without hardcoding anything into
 * the app. Seed photos point at picsum.photos directly (externalUrl) rather
 * than going through the real R2 upload pipeline, since they're throwaway
 * placeholders, not real uploads.
 *
 * Log in as: sarah@steps.local / steps1234  (parent of "Layla")
 *
 * Idempotent: skips entirely if Sarah already exists, and never runs in prod.
 */
export async function runDevSeed(): Promise<void> {
  if (env.nodeEnv === "production") return;
  if (await UserModel.findByEmail("sarah@steps.local")) return;

  const passwordHash = await bcrypt.hash("steps1234", 10);
  const sarah = await UserModel.create({
    email: "sarah@steps.local",
    name: "Sarah",
    passwordHash,
    role: "parent",
    childNames: ["Layla"],
  });

  const artShow = await EventModel.create({
    name: "Art Show",
    date: "2026-07-27",
    attendees: ["Layla", "Omar", "Sara", "Noor", "Yusuf", "Maya", "Adam", "Lina"],
    createdBy: sarah.id,
  });
  const summerSplash = await EventModel.create({
    name: "Summer Splash",
    date: "2026-07-30",
    attendees: ["Layla", "Omar", "Sara"],
    createdBy: sarah.id,
  });
  // Future event with no photos — surfaces as "Next Event" on Home.
  await EventModel.create({
    name: "Fall Festival",
    date: "2026-08-15",
    attendees: [],
    createdBy: sarah.id,
  });

  const addPhoto = async (eventId: string, seed: string, taggedLayla: boolean) => {
    const photo = await PhotoModel.create({
      eventId,
      filename: `${seed}.jpg`,
      externalUrl: `https://picsum.photos/seed/${seed}/600/600`,
      uploadedBy: sarah.id,
    });
    if (taggedLayla) await PhotoTagModel.create(photo.id, "Layla");
  };

  // Art Show — 18 photos, Layla tagged in the odd-indexed ones (9 of Layla's).
  for (let i = 1; i <= 18; i++) await addPhoto(artShow.id, `stepsart${i}`, i % 2 === 1);
  // Summer Splash — 5 photos, Layla tagged in the first 2.
  for (let i = 1; i <= 5; i++) await addPhoto(summerSplash.id, `stepssplash${i}`, i <= 2);

  await AnnouncementModel.create({
    text: "School closed next Friday for staff training. Have a wonderful long weekend! 🌟",
    createdBy: sarah.id,
  });

  // A few sample notifications for Sarah so the feed isn't empty on first open.
  await NotificationModel.create({
    userId: sarah.id,
    type: "photo",
    childName: "Layla",
    eventId: artShow.id,
  });
  await NotificationModel.create({ userId: sarah.id, type: "announcement" });
  await NotificationModel.create({
    userId: sarah.id,
    type: "event",
    eventName: "Summer Splash",
    eventId: summerSplash.id,
  });

  console.log("[devSeed] Seeded parent account sarah@steps.local / steps1234 (child: Layla)");
}
