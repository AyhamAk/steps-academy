import bcrypt from "bcryptjs";

import { env } from "./config/env";
import { AnnouncementModel } from "./models/announcement";
import { CourseModel } from "./models/course";
import { EventModel } from "./models/event";
import { NotificationModel } from "./models/notification";
import { PhotoModel } from "./models/photo";
import { PhotoTagModel } from "./models/photoTag";
import { StudentModel } from "./models/student";
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
  });

  // Real Student records — Sarah is linked to Layla only, so she sees Layla's
  // photos and nothing else, even though other children are in the same events.
  const classmateNames = ["Layla", "Omar", "Sara", "Noor", "Yusuf", "Maya", "Adam", "Lina"];
  const students = await Promise.all(
    classmateNames.map((name) => StudentModel.create({ name }))
  );
  const layla = students[0];
  await StudentModel.linkParent(sarah.id, layla.id);

  const artShow = await EventModel.create({
    name: "Art Show",
    date: "2026-07-27",
    attendeeIds: students.map((student) => student.id),
    createdBy: sarah.id,
  });
  const summerSplash = await EventModel.create({
    name: "Summer Splash",
    date: "2026-07-30",
    attendeeIds: students.slice(0, 3).map((student) => student.id),
    createdBy: sarah.id,
  });
  // Future event with no photos — surfaces as "Next Event" on Home.
  await EventModel.create({
    name: "Fall Festival",
    date: "2026-08-15",
    attendeeIds: [],
    createdBy: sarah.id,
  });

  const addPhoto = async (eventId: string, seed: string, taggedLayla: boolean) => {
    const photo = await PhotoModel.create({
      eventId,
      filename: `${seed}.jpg`,
      externalUrl: `https://picsum.photos/seed/${seed}/600/600`,
      uploadedBy: sarah.id,
    });
    if (taggedLayla) await PhotoTagModel.create(photo.id, layla.id);
  };

  // Art Show — 18 photos, Layla tagged in the odd-indexed ones (9 of Layla's).
  for (let i = 1; i <= 18; i++) await addPhoto(artShow.id, `stepsart${i}`, i % 2 === 1);
  // Summer Splash — 5 photos, Layla tagged in the first 2.
  for (let i = 1; i <= 5; i++) await addPhoto(summerSplash.id, `stepssplash${i}`, i <= 2);

  await AnnouncementModel.create({
    text: "School closed next Friday for staff training. Have a wonderful long weekend! 🌟",
    createdBy: sarah.id,
  });

  await CourseModel.create({
    name: "Swimming Lessons",
    description: "Fun and safe swimming lessons for toddlers. Small groups, certified instructors.",
    emoji: "🏊",
    instructor: "Coach Rami",
    schedule: "Sundays & Wednesdays",
    capacity: 10,
    accentColor: "#7B9EC4",
  });
  await CourseModel.create({
    name: "Arabic Calligraphy",
    description: "Introduction to Arabic letters and beautiful calligraphy for young learners.",
    emoji: "✍️",
    instructor: "Teacher Hana",
    schedule: "Mondays",
    capacity: 8,
    accentColor: "#D4A843",
  });
  await CourseModel.create({
    name: "Little Scientists",
    description: "Hands-on science experiments designed for curious toddler minds.",
    emoji: "🔬",
    instructor: "Dr. Sami",
    schedule: "Thursdays",
    capacity: 12,
    accentColor: "#5B8A5E",
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
