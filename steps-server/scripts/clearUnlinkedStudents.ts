/**
 * Removes every child nobody is linked to.
 *
 * An unlinked Student is invisible in the app — no parent can see them, and
 * they only clutter the admin roster. Their invite codes go with them, so any
 * code already handed out for one stops working.
 *
 *   npx tsx scripts/clearUnlinkedStudents.ts           # dry run
 *   npx tsx scripts/clearUnlinkedStudents.ts --apply
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const orphans = await prisma.student.findMany({
    where: { guardians: { none: {} } },
    select: { id: true, name: true, _count: { select: { inviteCodes: true, tags: true } } },
    orderBy: { name: "asc" },
  });

  const codes = orphans.reduce((sum, s) => sum + s._count.inviteCodes, 0);
  console.log(`\n${orphans.length} children with no guardian, holding ${codes} invite codes:`);
  console.log("  " + orphans.map((s) => s.name).join(", "));

  if (!APPLY) {
    console.log("\nDry run — nothing changed. Re-run with --apply.\n");
    return prisma.$disconnect();
  }

  await prisma.student.deleteMany({ where: { id: { in: orphans.map((s) => s.id) } } });

  const [left, unlinked] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { guardians: { none: {} } } }),
  ]);
  console.log(`\nDeleted ${orphans.length}. ${left} children left, ${unlinked} still unlinked.\n`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
