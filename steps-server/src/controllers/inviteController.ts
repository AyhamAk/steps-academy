import { Request, Response } from "express";

import { formatCode, InviteModel, inviteStatus } from "../models/invite";
import { StudentModel } from "../models/student";
import { prisma } from "../lib/prisma";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Every rejection says the same thing on purpose. Distinguishing "expired"
 * from "already used" from "no such code" would turn this endpoint into a way
 * to discover which codes exist.
 */
const INVALID = "That code isn't valid. Please check it with the academy.";

export type ValidatedInvite = {
  id: string;
  studentId: string;
  studentName: string;
};

/**
 * Shared by the public check, the authenticated redeem, and registration.
 * Returns null for anything unusable, so callers can respond identically.
 */
export async function validateInviteCode(
  rawCode: string | undefined,
  userId?: string
): Promise<ValidatedInvite | null> {
  if (!rawCode || typeof rawCode !== "string") return null;

  const invite = await InviteModel.findByCode(rawCode);
  if (!invite) return null;
  if (inviteStatus(invite) !== "active") return null;

  // A guardian who already redeemed this code shouldn't burn the second use by
  // going through again — that would quietly lock out the other parent.
  if (userId) {
    const already = await prisma.inviteRedemption.findUnique({
      where: { codeId_userId: { codeId: invite.id, userId } },
    });
    if (already) return null;
  }

  return { id: invite.id, studentId: invite.studentId, studentName: invite.student.name };
}

/** Public, rate-limited: powers "You're connecting to Layla" before any account exists. */
export async function checkInvite(req: Request, res: Response) {
  const { code } = req.body as { code?: string };
  const invite = await validateInviteCode(code);
  if (!invite) {
    return res.status(404).json({ message: INVALID });
  }
  res.json({ studentName: invite.studentName });
}

/** An existing parent adding another child. */
export async function redeemInvite(req: Request, res: Response) {
  const { code } = req.body as { code?: string };
  const invite = await validateInviteCode(code, req.userId!);
  if (!invite) {
    return res.status(400).json({ message: INVALID });
  }

  await InviteModel.redeem(invite.id, req.userId!, invite.studentId);
  res.json({ studentName: invite.studentName });
}

export async function createInvite(req: Request, res: Response) {
  const { studentId, expiresInDays, maxUses } = req.body as {
    studentId?: string;
    expiresInDays?: number | null;
    maxUses?: number;
  };

  if (!studentId) {
    return res.status(400).json({ message: "studentId is required" });
  }
  const student = await StudentModel.findById(studentId);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const invite = await InviteModel.create({
    studentId,
    createdBy: req.userId!,
    maxUses,
    expiresInDays: expiresInDays ?? null,
  });

  res.status(201).json({
    invite: {
      id: invite.id,
      code: formatCode(invite.code),
      studentId,
      studentName: student.name,
      usesLeft: invite.maxUses - invite.useCount,
      status: inviteStatus(invite),
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    },
  });
}

export async function listInvites(req: Request, res: Response) {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : null;
  const invites = studentId
    ? await InviteModel.listForStudent(studentId)
    : await InviteModel.listWithStudents();

  res.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      code: formatCode(invite.code),
      studentId: invite.studentId,
      studentName: invite.student.name,
      guardianPhone: invite.student.guardianPhone,
      usesLeft: Math.max(0, invite.maxUses - invite.useCount),
      redeemedCount: invite.redemptions.length,
      sentAt: invite.sentAt,
      status: inviteStatus(invite),
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
  });
}

export async function revokeInvite(req: Request, res: Response) {
  const invite = await InviteModel.revoke(param(req, "inviteId"));
  if (!invite) {
    return res.status(404).json({ message: "Invite not found" });
  }
  res.json({ message: "Invite revoked" });
}

/**
 * One code for every child who hasn't got a usable one. Deliberately skips
 * children that already have an active code: two live codes for one family is
 * exactly the confusion this is meant to remove, and it makes the button safe
 * to press again after adding a student mid-term.
 */
export async function bulkCreateInvites(req: Request, res: Response) {
  const studentIds = await InviteModel.studentIdsWithoutActiveCode();

  for (const studentId of studentIds) {
    await InviteModel.create({ studentId, createdBy: req.userId! });
  }

  res.status(201).json({ createdCount: studentIds.length });
}

export async function markInviteSent(req: Request, res: Response) {
  const invite = await InviteModel.markSent(param(req, "inviteId"));
  if (!invite) {
    return res.status(404).json({ message: "Invite not found" });
  }
  res.json({ sentAt: invite.sentAt });
}
