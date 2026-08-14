import { randomInt } from "crypto";

import { InviteCode } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type { InviteCode };

/**
 * No 0/O, 1/I/L, or U — the characters people misread when copying a code off
 * a slip of paper or out of a WhatsApp message. 30 symbols over 8 places is
 * ~6.5e11 combinations, which with the auth rate limiter puts guessing well
 * out of reach.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

/** Accepts "k7f2-9qrm", "K7F2 9QRM" and "k7f29qrm" as the same code. */
export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Codes are shown to humans as XXXX-XXXX; stored without the dash. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export type InviteStatus = "active" | "spent" | "revoked" | "expired";

export function inviteStatus(invite: InviteCode, now = new Date()): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt <= now) return "expired";
  if (invite.useCount >= invite.maxUses) return "spent";
  return "active";
}

export const InviteModel = {
  /**
   * Retries on the astronomically unlikely collision rather than letting a
   * unique-constraint error surface as a 500 to an admin pressing "generate".
   */
  async create(input: {
    studentId: string;
    createdBy: string;
    maxUses?: number;
    expiresInDays?: number | null;
  }): Promise<InviteCode> {
    const expiresAt =
      input.expiresInDays != null
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await prisma.inviteCode.create({
          data: {
            code: generateCode(),
            studentId: input.studentId,
            createdBy: input.createdBy,
            maxUses: input.maxUses ?? 2,
            expiresAt,
          },
        });
      } catch (error) {
        const isCollision =
          typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
        if (!isCollision || attempt === 4) throw error;
      }
    }
    throw new Error("Could not generate a unique invite code");
  },

  /** Students that have no usable code right now — the ones a bulk run covers. */
  async studentIdsWithoutActiveCode(): Promise<string[]> {
    const students = await prisma.student.findMany({
      select: { id: true, inviteCodes: true },
    });
    return students
      .filter((student) => !student.inviteCodes.some((code) => inviteStatus(code) === "active"))
      .map((student) => student.id);
  },

  async markSent(id: string): Promise<InviteCode | null> {
    try {
      return await prisma.inviteCode.update({
        where: { id },
        data: { sentAt: new Date() },
      });
    } catch {
      return null;
    }
  },

  async findByCode(raw: string) {
    return prisma.inviteCode.findUnique({
      where: { code: normaliseCode(raw) },
      include: { student: true },
    });
  },

  async listWithStudents() {
    return prisma.inviteCode.findMany({
      include: { student: true, redemptions: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async listForStudent(studentId: string) {
    return prisma.inviteCode.findMany({
      where: { studentId },
      include: { student: true, redemptions: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async revoke(id: string): Promise<InviteCode | null> {
    try {
      return await prisma.inviteCode.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    } catch {
      return null;
    }
  },

  /**
   * Consumes a code on behalf of an existing account: links parent to student,
   * bumps the use count and records who used it — all or nothing.
   *
   * The whole point of the feature is that holding a code means being linked;
   * a partial success (code spent but no link, or linked but not counted)
   * would leave exactly the manual-cleanup mess this replaces.
   *
   * `createLink` is skipped silently if the link already exists, so a second
   * guardian redeeming after the first doesn't collide.
   */
  async redeem(codeId: string, userId: string, studentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: userId, studentId } },
        create: { parentId: userId, studentId },
        update: {},
      });
      await tx.inviteCode.update({
        where: { id: codeId },
        data: { useCount: { increment: 1 } },
      });
      await tx.inviteRedemption.create({
        data: { codeId, userId },
      });
    });
  },
};
