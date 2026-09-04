/**
 * Removes "Demo Child" from any photo that is a real upload.
 *
 * The App Store review account is linked to Demo Child, so anything that child
 * is tagged in is shown to a stranger at Apple. The account was set up seeing
 * only picsum placeholders; tagging Demo Child into real event albums since
 * then put photographs of the academy's actual children in front of the
 * reviewer.
 *
 * Placeholder photos are the ones with an `externalUrl` — real uploads live in
 * R2 and have object keys instead. Only tags on real uploads are removed, and
 * only Demo Child's: no photo is deleted and no other child's tag is touched.
 *
 * Run from `steps-server/`:  npx tsx scripts/untagDemoChild.ts
 */
import { prisma } from "../src/lib/prisma";

const CHILD_NAME = "Demo Child";

async function main(): Promise<void> {
  const child = await prisma.student.findFirst({ where: { name: CHILD_NAME } });
  if (!child) throw new Error(`No student named "${CHILD_NAME}".`);

  const tags = await prisma.photoTag.findMany({
    where: { studentId: child.id },
    include: { photo: { select: { id: true, externalUrl: true, key: true, event: true } } },
  });

  const onRealUploads = tags.filter((tag) => !tag.photo.externalUrl);

  console.log(`${CHILD_NAME} is tagged in ${tags.length} photos.`);
  console.log(`  placeholders (keeping):  ${tags.length - onRealUploads.length}`);
  console.log(`  real uploads (removing): ${onRealUploads.length}`);

  if (onRealUploads.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  for (const tag of onRealUploads) {
    console.log(`  - untagging from "${tag.photo.event.name}"`);
  }

  const { count } = await prisma.photoTag.deleteMany({
    where: { id: { in: onRealUploads.map((tag) => tag.id) } },
  });
  console.log(`\nRemoved ${count} tags. The photos themselves are untouched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
