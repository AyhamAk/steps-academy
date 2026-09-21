/**
 * Retires `admin@steps.local` in favour of a real admin account.
 *
 * That account was created by the dev seed and its password is printed in
 * `src/devSeed.ts`, so it has been a publicly known admin login on a public
 * API. It also ended up owning the academy's invite codes and an
 * announcement, which is why it cannot simply be deleted: those relations are
 * Restrict, and Postgres refuses.
 *
 *   npx tsx scripts/replaceLegacyAdmin.ts            # dry run
 *   npx tsx scripts/replaceLegacyAdmin.ts --apply
 *
 * Idempotent: re-running resets the new account's password and does nothing
 * else once the old one is gone.
 */
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { UserModel } from "../src/models/user";

const OLD_EMAIL = "admin@steps.local";

const NEW_EMAIL = "nagam@steps-academy.com";
const NEW_NAME = "Nagam";
const NEW_PASSWORD = "Steps1234";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const old = await UserModel.findByEmail(OLD_EMAIL);
  const owned = old ? await UserModel.ownedContentCounts(old.id) : null;

  console.log(`\nNew admin:  ${NEW_NAME} <${NEW_EMAIL}>`);
  console.log(`Password:   ${NEW_PASSWORD}`);

  if (!old) {
    console.log(`\n${OLD_EMAIL} is already gone — only the new account will be set up.`);
  } else {
    console.log(`\nRetiring ${OLD_EMAIL}, which owns:`);
    console.log(
      `   ${owned!.events} albums · ${owned!.photos} photos · ${owned!.announcements} announcements · ` +
        `${owned!.invites} invite codes · ${owned!.tips} tips`,
    );
    console.log("   All of it moves to the new account, then the old one is deleted.");
  }

  if (!APPLY) {
    console.log("\nDry run — nothing changed. Re-run with --apply.\n");
    return prisma.$disconnect();
  }

  // Create (or reset) the new admin first: deleting the old one while it is
  // still the only other admin would trip the last-admin guard.
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
  const existing = await UserModel.findByEmail(NEW_EMAIL);
  const fresh = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, role: "admin", name: NEW_NAME },
      })
    : await UserModel.create({ email: NEW_EMAIL, name: NEW_NAME, passwordHash, role: "admin" });

  console.log(existing ? "\nNew admin already existed — password reset." : "\nNew admin created.");

  if (old) {
    await UserModel.reassignContent(old.id, fresh.id);
    console.log("Content moved.");
    await UserModel.remove(old.id);
    console.log(`${OLD_EMAIL} deleted.`);
  }

  const admins = await UserModel.listAdmins();
  console.log(`\nAdmins now: ${admins.map((a) => a.email).join(", ")}\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
