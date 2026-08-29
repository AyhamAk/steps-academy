/**
 * Creates the permanent App Store / Play review account.
 *
 * Sign-up in this app is gated by a per-child invite code, so a store reviewer
 * cannot register on their own — without this account the review is rejected
 * under App Store Guideline 2.1 (and Play's equivalent login requirement).
 *
 * Unlike `runDevSeed()`, this is MEANT to run against production, so it is not
 * wired into startup. Run it by hand from `steps-server/`:
 *
 *   npx tsx scripts/seedReviewer.ts
 *
 * The demo child's photos are picsum placeholders on purpose. A reviewer must
 * never be shown real children — the gallery filters strictly by the
 * ParentStudent link, so this account sees the demo event and nothing else.
 *
 * Idempotent: safe to re-run. It resets the password every time, so the
 * credentials in App Store Connect keep working even if someone changes them.
 */
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { EventModel } from "../src/models/event";
import { PhotoModel } from "../src/models/photo";
import { PhotoTagModel } from "../src/models/photoTag";
import { StudentModel } from "../src/models/student";
import { UserModel } from "../src/models/user";

const REVIEWER_EMAIL = "appreview@steps-academy.com";
const REVIEWER_PASSWORD = "StepsReview2026!";
const CHILD_NAME = "Demo Child";
const EVENT_NAME = "Demo Day";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(REVIEWER_PASSWORD, 10);

  let reviewer = await UserModel.findByEmail(REVIEWER_EMAIL);
  if (reviewer) {
    await prisma.user.update({ where: { id: reviewer.id }, data: { passwordHash } });
    console.log("Reviewer account already existed — password reset.");
  } else {
    reviewer = await UserModel.create({
      email: REVIEWER_EMAIL,
      name: "App Review",
      passwordHash,
      role: "parent",
    });
    console.log("Reviewer account created.");
  }

  // Looked up by name rather than created blindly, so re-running never leaves a
  // second "Demo Child" on the roster for the admin to clean up.
  let child = await prisma.student.findFirst({ where: { name: CHILD_NAME } });
  if (!child) {
    child = await StudentModel.create({ name: CHILD_NAME });
    console.log("Demo child created.");
  }
  await StudentModel.linkParent(reviewer.id, child.id);

  const existing = await prisma.event.findFirst({
    where: { name: EVENT_NAME },
    include: { photos: true },
  });
  if (existing && existing.photos.length > 0) {
    console.log("Demo event and photos already present.");
  } else {
    const event =
      existing ??
      (await EventModel.create({
        name: EVENT_NAME,
        date: "2026-06-01",
        attendeeIds: [child.id],
        createdBy: reviewer.id,
      }));

    for (let i = 1; i <= 6; i++) {
      const photo = await PhotoModel.create({
        eventId: event.id,
        filename: `demo${i}.jpg`,
        externalUrl: `https://picsum.photos/seed/stepsdemo${i}/600/600`,
        uploadedBy: reviewer.id,
      });
      await PhotoTagModel.create(photo.id, child.id);
    }
    console.log("Demo event with 6 tagged photos created.");
  }

  console.log("\nSign-in details for App Store Connect / Play Console:");
  console.log(`  email:    ${REVIEWER_EMAIL}`);
  console.log(`  password: ${REVIEWER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
