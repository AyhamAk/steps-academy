import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { InviteModel } from "../models/invite";
import { StudentModel } from "../models/student";
import { UserModel } from "../models/user";
import { checkSignInCode, sendSignInCode } from "../services/phoneCodes";
import { parseChildInput } from "../utils/childInput";
import { signToken } from "../utils/jwt";
import { toE164 } from "../utils/phone";
import { validateInviteCode } from "./inviteController";

/**
 * Phone sign-in: a number, a WhatsApp code, and — the first time only — a name
 * and, unless the academy already knows the number, a child. No email, no
 * password, no invite code.
 *
 *   POST /phone/start     { phone }              → code sent
 *   POST /phone/verify    { phone, code }        → { token, user } for a known number,
 *                                                  or a number on a child;
 *                                                  { signupToken } for any other
 *   POST /phone/register  { signupToken, firstName, familyName, child }
 *
 * Nursery families are recognised by their number: the admin enters each
 * child with the mother's and father's mobiles, and the first verified sign-in
 * with either one creates that parent's account on the spot, already linked —
 * no sign-up screens. Course families, whose number the academy doesn't have,
 * type their child in instead.
 *
 * The signup token proves "this number was verified in the last 30 minutes".
 * It is signed with its own derived secret and carries no userId, so it can
 * never be passed off as a session token.
 */

const SIGNUP_TOKEN_TTL = "30m";
const signupSecret = () => `${env.jwtSecret}:phone-signup`;

type SignupClaims = { phone: string; purpose: "phone-signup" };

function signSignupToken(phone: string): string {
  const claims: SignupClaims = { phone, purpose: "phone-signup" };
  return jwt.sign(claims, signupSecret(), { expiresIn: SIGNUP_TOKEN_TTL });
}

function readSignupToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  try {
    const claims = jwt.verify(token, signupSecret()) as SignupClaims;
    return claims.purpose === "phone-signup" ? claims.phone : null;
  } catch {
    return null;
  }
}

export async function startPhoneSignIn(req: Request, res: Response) {
  const phone = toE164(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ message: "Please enter a valid mobile number" });
  }
  const locale = typeof req.body?.locale === "string" ? req.body.locale : undefined;
  const result = await sendSignInCode(phone, locale);
  if (!result.ok) {
    if (result.reason === "too_soon") {
      return res.status(429).json({ message: "Please wait 30 seconds before asking for another code." });
    }
    if (result.reason === "too_many") {
      return res.status(429).json({ message: "Too many codes for this number. Please try again in an hour." });
    }
    return res
      .status(result.reason === "not_configured" ? 503 : 502)
      .json({ message: "We couldn't send the code right now. Please try again in a minute." });
  }
  res.json({ sent: true });
}

export async function verifyPhoneSignIn(req: Request, res: Response) {
  const phone = toE164(req.body?.phone);
  const code = typeof req.body?.code === "string" ? req.body.code.replace(/\D/g, "") : "";
  if (!phone || code.length < 4) {
    return res.status(400).json({ message: "Please enter the code from the SMS" });
  }

  if (!(await checkSignInCode(phone, code))) {
    // One answer for wrong, expired and already-used codes alike.
    return res.status(401).json({ message: "That code isn't right, or it has expired." });
  }

  // The manager's test number signs in as the admin account named by email,
  // never as a new parent.
  if (env.reviewAdminPhone && phone === env.reviewAdminPhone) {
    const admin = env.reviewAdminEmail ? await UserModel.findByEmail(env.reviewAdminEmail) : null;
    if (!admin || admin.role !== "admin") {
      return res.status(503).json({ message: "The test manager account isn't set up." });
    }
    return res.json({ token: signToken({ userId: admin.id }), user: await UserModel.toPublic(admin) });
  }

  const user = await UserModel.findByPhone(phone);
  if (user) {
    // Picks up any child the academy has added this number to since last time.
    await StudentModel.linkByPhone(user.id, phone);
    return res.json({ token: signToken({ userId: user.id }), user: await UserModel.toPublic(user) });
  }
  // A number the academy entered on a child: the account is ready.
  const matched = await StudentModel.findByGuardianPhone(phone);
  if (matched.length > 0) {
    const created = await createLinkedAccount(phone, matched);
    return res.json({ token: signToken({ userId: created.id }), user: await UserModel.toPublic(created) });
  }

  // A number we have never seen: prove it was verified, then collect the rest.
  res.json({ signupToken: signSignupToken(phone), matchedChildren: [] });
}

type MatchedChild = Awaited<ReturnType<typeof StudentModel.findByGuardianPhone>>[number];

/**
 * The account for a parent the academy already entered, named from the roster:
 * the mother by her name and the family's, the father as "والد <child>"
 * (the sheet has no father's name). The parent never typed either.
 */
function rosterName(phone: string, child: MatchedChild): { name: string; familyName: string | null } {
  const [first, ...rest] = child.name.trim().split(/\s+/);
  const familyName = rest.join(" ") || null;
  if (phone === child.motherPhone && child.motherName) {
    return { name: [child.motherName, familyName].filter(Boolean).join(" "), familyName };
  }
  return { name: phone === child.fatherPhone ? `والد ${first}` : `ولي أمر ${first}`, familyName };
}

async function createLinkedAccount(phone: string, matched: MatchedChild[]) {
  const { name, familyName } = rosterName(phone, matched[0]);
  let user;
  try {
    user = await UserModel.create({ phone, name, familyName, role: "parent" });
  } catch (error) {
    // Two sign-ins racing: the other one made the account first.
    const existing = await UserModel.findByPhone(phone);
    if (!existing) throw error;
    user = existing;
  }
  await StudentModel.linkByPhone(user.id, phone);
  return user;
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 40) : "";
}

export async function registerWithPhone(req: Request, res: Response) {
  const phone = readSignupToken(req.body?.signupToken);
  if (!phone) {
    return res
      .status(401)
      .json({ message: "Your verification has expired. Please enter your number again." });
  }

  const firstName = cleanName(req.body?.firstName);
  const familyName = cleanName(req.body?.familyName);
  if (!firstName || !familyName) {
    return res.status(400).json({ message: "Please enter your first name and family name" });
  }

  // Someone who finished sign-up in another tab: just sign them in.
  const existing = await UserModel.findByPhone(phone);
  if (existing) {
    return res.json({ token: signToken({ userId: existing.id }), user: await UserModel.toPublic(existing) });
  }

  const input = { phone, name: `${firstName} ${familyName}`, familyName, role: "parent" as const };

  // Nursery family: the academy already has this number on their child.
  const matched = await StudentModel.findByGuardianPhone(phone);
  if (matched.length > 0) {
    const user = await UserModel.create(input);
    await StudentModel.linkByPhone(user.id, phone);
    return res.status(201).json({ token: signToken({ userId: user.id }), user: await UserModel.toPublic(user) });
  }

  // Otherwise the parent types their child in (courses); that child grants no
  // photos. Copies of the app from before phone matching still send an invite
  // code instead, which is honoured until they update.
  const inviteCode = req.body?.inviteCode;
  const hasCode = typeof inviteCode === "string" && inviteCode.trim() !== "";
  const invite = hasCode ? await validateInviteCode(inviteCode) : null;
  if (hasCode && !invite) {
    return res
      .status(403)
      .json({ message: "That code isn't valid. Please check it with the academy." });
  }
  const childInput = hasCode ? null : parseChildInput(req.body?.child);
  if (typeof childInput === "string") {
    return res.status(400).json({ message: childInput });
  }

  let user;
  if (invite) {
    user = await UserModel.create(input);
    await InviteModel.redeem(invite.id, user.id, invite.studentId);
  } else {
    user = await UserModel.createWithOwnChild(input, childInput!);
  }

  res.status(201).json({ token: signToken({ userId: user.id }), user: await UserModel.toPublic(user) });
}
