/**
 * Creates the academy manager's admin account, and an invite code someone can
 * use to sign up as an ordinary parent.
 *
 * Run by hand from `steps-server/`:
 *
 *   npx tsx scripts/seedManager.ts
 *
 * The invite code is issued against "Demo Child" — the same placeholder the
 * store reviewer is linked to — so testing a real sign-up never puts a
 * stranger on a real family's photos, and never adds a row to the academy's
 * actual roster.
 *
 * Idempotent: re-running resets the manager's password and issues a fresh
 * code. Old codes stay valid until they are revoked from the admin screens.
 */
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { formatCode, InviteModel } from "../src/models/invite";
import { UserModel } from "../src/models/user";

const MANAGER_EMAIL = "manager@steps-academy.com";
const MANAGER_PASSWORD = "Manager2026";
const MANAGER_NAME = "Academy Manager";
const CHILD_NAME = "Demo Child";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 10);

  let manager = await UserModel.findByEmail(MANAGER_EMAIL);
  if (manager) {
    await prisma.user.update({
      where: { id: manager.id },
      data: { passwordHash, role: "admin" },
    });
    console.log("Manager account already existed — password reset.");
  } else {
    manager = await UserModel.create({
      email: MANAGER_EMAIL,
      name: MANAGER_NAME,
      passwordHash,
      role: "admin",
    });
    console.log("Manager account created.");
  }

  const child = await prisma.student.findFirst({ where: { name: CHILD_NAME } });
  if (!child) {
    throw new Error(`No student named "${CHILD_NAME}" — run seedReviewer.ts first.`);
  }

  const invite = await InviteModel.create({
    studentId: child.id,
    createdBy: manager.id,
    maxUses: 5,
    expiresInDays: 30,
  });

  console.log("\nManager (admin) — sees every screen:");
  console.log(`  email:    ${MANAGER_EMAIL}`);
  console.log(`  password: ${MANAGER_PASSWORD}`);
  console.log("\nParent sign-up — enter this code on the sign-up screen:");
  console.log(`  code:     ${formatCode(invite.code)}`);
  console.log("  5 uses, expires in 30 days, links to Demo Child.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
