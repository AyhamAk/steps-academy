import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { InviteModel } from "../models/invite";
import { UserModel } from "../models/user";
import { checkSignInCode, sendSignInCode } from "../services/phoneCodes";
import { parseChildInput } from "../utils/childInput";
import { signToken } from "../utils/jwt";
import { toE164 } from "../utils/phone";
import { validateInviteCode } from "./inviteController";

/**
 * Phone sign-in: a number, a WhatsApp code, and — the first time only — a name
 * and a child. No email, no password.
 *
 *   POST /phone/start     { phone }              → code sent
 *   POST /phone/verify    { phone, code }        → { token, user } for a known number,
 *                                                  or { signupToken } for a new one
 *   POST /phone/register  { signupToken, firstName, familyName, inviteCode | child }
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

  const user = await UserModel.findByPhone(phone);
  if (user) {
    return res.json({ token: signToken({ userId: user.id }), user: await UserModel.toPublic(user) });
  }
  // A number we have never seen: prove it was verified, then collect the rest.
  res.json({ signupToken: signSignupToken(phone) });
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

  // Same two paths as email sign-up: an invite code (nursery) or a child the
  // parent types in (courses). The typed-in child grants no photos.
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

  const input = { phone, name: `${firstName} ${familyName}`, familyName, role: "parent" as const };
  let user;
  if (invite) {
    user = await UserModel.create(input);
    await InviteModel.redeem(invite.id, user.id, invite.studentId);
  } else {
    user = await UserModel.createWithOwnChild(input, childInput!);
  }

  res.status(201).json({ token: signToken({ userId: user.id }), user: await UserModel.toPublic(user) });
}
