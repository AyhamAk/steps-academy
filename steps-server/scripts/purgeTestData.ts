/**
 * One-off cleanup before the academy's real families arrive.
 *
 * Removes every account except the ones listed below, the children who were
 * only ever linked to those accounts, and every album with its photographs —
 * including the files in R2, which nothing else in the codebase has ever
 * deleted.
 *
 * Run from `steps-server/`:
 *
 *   npx tsx scripts/purgeTestData.ts            # dry run, changes nothing
 *   npx tsx scripts/purgeTestData.ts --apply    # actually deletes
 *
 * There is no backup on the Supabase free tier, so the dry run is the default
 * and the apply flag has to be typed out.
 */
import { deleteObjects } from "../src/lib/r2";
import { prisma } from "../src/lib/prisma";

/**
 * Accounts that survive.
 *
 * `appreview@` is the App Store reviewer login. Sign-up is invite-code gated,
 * so deleting it means Apple cannot get into the app at all — a straight
 * rejection under Guideline 2.1, and 1.0.1 is in review.
 */
const KEEP_EMAILS = [
  "aklaani508@gmail.com",
  "aklaani509@gmail.com",
  "appreview@steps-academy.com",
].map((email) => email.toLowerCase());

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, email: true } });
  const keepers = await prisma.user.findMany({
    where: { OR: [{ role: "admin" }, { email: { in: KEEP_EMAILS } }] },
    select: { id: true, name: true, email: true, role: true },
  });
  const keepIds = new Set(keepers.map((user) => user.id));

  const doomed = await prisma.user.findMany({
    where: { id: { notIn: [...keepIds] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const doomedIds = doomed.map((user) => user.id);

  // A child stays if anyone who is staying is still linked to them. Children
  // with no guardian at all were never connected to a deleted account, so they
  // stay too — they are roster entries waiting for a parent.
  const doomedStudents = await prisma.student.findMany({
    where: {
      guardians: { some: { parentId: { in: doomedIds } } },
      NOT: { guardians: { some: { parentId: { in: [...keepIds] } } } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const albums = await prisma.event.findMany({ select: { id: true, name: true, date: true } });
  const photos = await prisma.photo.findMany({
    select: { key: true, thumbKey: true, mediumKey: true, externalUrl: true },
  });
  const storageKeys = photos.flatMap((photo) => [photo.key, photo.thumbKey, photo.mediumKey]);
  const realFiles = storageKeys.filter(Boolean).length;

  // Announcements and tips are Restrict relations — a user who wrote one
  // cannot be deleted while it exists, so they move to an admin first.
  const heir = admins[0];
  const [strandedAnnouncements, strandedTips] = await Promise.all([
    prisma.announcement.count({ where: { createdBy: { in: doomedIds } } }),
    prisma.tip.count({ where: { createdBy: { in: doomedIds } } }),
  ]);

  console.log(`\nKeeping ${keepers.length} accounts:`);
  for (const user of keepers) console.log(`   ${user.name} <${user.email}> ${user.role}`);

  console.log(`\nDeleting ${doomed.length} accounts:`);
  for (const user of doomed) console.log(`   ${user.name} <${user.email}>`);

  console.log(`\nDeleting ${doomedStudents.length} children:`);
  console.log("   " + doomedStudents.map((student) => student.name).join(", "));

  console.log(`\nDeleting ${albums.length} albums and ${photos.length} photos (${realFiles} files in R2).`);
  if (strandedAnnouncements || strandedTips) {
    console.log(`Reassigning ${strandedAnnouncements} announcements and ${strandedTips} tips to ${heir.email}.`);
  }

  if (!APPLY) {
    console.log("\nDry run — nothing was changed. Re-run with --apply to do it.\n");
    await prisma.$disconnect();
    return;
  }

  console.log("\nApplying…");

  // One transaction: a half-finished purge would leave orphaned links behind
  // and no clean way to work out where it stopped.
  await prisma.$transaction([
    prisma.announcement.updateMany({ where: { createdBy: { in: doomedIds } }, data: { createdBy: heir.id } }),
    prisma.tip.updateMany({ where: { createdBy: { in: doomedIds } }, data: { createdBy: heir.id } }),
    // Albums cascade to photos, tags and attendance.
    prisma.event.deleteMany({}),
    prisma.student.deleteMany({ where: { id: { in: doomedStudents.map((s) => s.id) } } }),
    prisma.user.deleteMany({ where: { id: { in: doomedIds } } }),
  ]);

  console.log("Database done. Removing files from R2…");
  await deleteObjects(storageKeys);

  const [users, students, events, remainingPhotos] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.event.count(),
    prisma.photo.count(),
  ]);
  console.log(`\nLeft behind: ${users} users, ${students} children, ${events} albums, ${remainingPhotos} photos.\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
