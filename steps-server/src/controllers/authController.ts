import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env";
import { InviteModel } from "../models/invite";
import { UserModel } from "../models/user";
import { validateInviteCode } from "./inviteController";
import { signToken } from "../utils/jwt";

const googleClient = new OAuth2Client(env.googleClientId);

export async function register(req: Request, res: Response) {
  const { email, name, password, inviteCode } = req.body as {
    email?: string;
    name?: string;
    password?: string;
    inviteCode?: string;
  };

  if (!email || !name || !password) {
    return res.status(400).json({ message: "email, name and password are required" });
  }

  // Accounts are by invitation only. The code also says which child this
  // parent belongs to, so sign-up never has to ask — and never has to trust
  // the answer.
  const invite = await validateInviteCode(inviteCode);
  if (!invite) {
    return res
      .status(403)
      .json({ message: "That code isn't valid. Please check it with the academy." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (await UserModel.findByEmail(email)) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = env.adminEmails.includes(email.toLowerCase()) ? "admin" : "parent";
  const user = await UserModel.create({ email, name, passwordHash, role });
  // Spending the code and creating the link happen together; a new account
  // that isn't linked to its child is the exact state this replaces.
  await InviteModel.redeem(invite.id, user.id, invite.studentId);

  const token = signToken({ userId: user.id });

  res.status(201).json({ token, user: await UserModel.toPublic(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await UserModel.findByEmail(email);
  if (!user?.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id });
  res.json({ token, user: await UserModel.toPublic(user) });
}

export async function googleAuth(req: Request, res: Response) {
  // 404 rather than 403: while the feature is off, the endpoint should not
  // advertise that it exists. The app hides its button behind the matching
  // GOOGLE_SIGN_IN_ENABLED flag.
  if (!env.googleSignInEnabled) {
    return res.status(404).json({ message: "Not found" });
  }

  const { idToken, inviteCode } = req.body as { idToken?: string; inviteCode?: string };

  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleAudiences,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }
    // An unverified address is not proof of anything. Below, an existing
    // account is matched on email alone — so without this check, a Google
    // account carrying a parent's address would be handed that parent's
    // session.
    if (payload.email_verified !== true) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    let user = await UserModel.findByEmail(payload.email);
    if (!user) {
      // Signing in with Google used to create an account for anyone who asked.
      // A first-time Google user is a registration, so it needs an invite just
      // like the email flow does.
      const invite = await validateInviteCode(inviteCode);
      if (!invite) {
        return res
          .status(403)
          .json({ message: "That code isn't valid. Please check it with the academy." });
      }

      const role = env.adminEmails.includes(payload.email.toLowerCase()) ? "admin" : "parent";
      user = await UserModel.create({
        email: payload.email,
        name: payload.name ?? payload.email,
        googleId: payload.sub,
        role,
      });
      await InviteModel.redeem(invite.id, user.id, invite.studentId);
    } else if (!user.googleId) {
      // First time this email/password account has come in through Google.
      // Record the link rather than leaving the two identities matched only
      // by a string comparison on every future sign-in.
      await UserModel.linkGoogleId(user.id, payload.sub);
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: await UserModel.toPublic(user) });
  } catch {
    res.status(401).json({ message: "Google token verification failed" });
  }
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: await UserModel.toPublic(user) });
}

export async function logout(req: Request, res: Response) {
  // Best-effort — a stale token left behind just means one missed push, not a crash.
  await UserModel.updatePushToken(req.userId!, null).catch(() => {});
  res.json({ message: "Logged out" });
}

/**
 * Permanent account deletion, required by both app stores.
 *
 * What goes: the account, its parent-child links, its notifications and its
 * invite redemptions (all cascade in the schema).
 * What stays: the children themselves, their photos and their course places —
 * those belong to the academy, not to one guardian, and a second guardian may
 * still be using them. Feedback and enrolments keep their rows with the author
 * nulled out.
 */
export async function deleteAccount(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // An academy that deletes its last admin can never manage anything again.
  if (user.role === "admin") {
    const admins = await UserModel.listAdmins();
    if (admins.length <= 1) {
      return res.status(409).json({
        message: "This is the only admin account. Make someone else an admin first.",
      });
    }
  }

  try {
    await UserModel.remove(user.id);
  } catch {
    // Admins own events, photos and announcements, which are deliberately
    // protected from cascade deletion.
    return res.status(409).json({
      message: "This account still owns academy content. Please contact the academy.",
    });
  }

  res.json({ message: "Account deleted" });
}

export async function updatePushToken(req: Request, res: Response) {
  const { pushToken, locale } = req.body as { pushToken?: string; locale?: string };
  if (!pushToken || typeof pushToken !== "string") {
    return res.status(400).json({ message: "pushToken is required" });
  }
  await UserModel.updatePushToken(req.userId!, pushToken);
  // Sent alongside the token because push copy is rendered by the operating
  // system and cannot be translated on arrival — it has to leave here in the
  // language the parent reads.
  if (locale === "en" || locale === "ar" || locale === "he") {
    await UserModel.updateLocale(req.userId!, locale);
  }
  res.json({ message: "Push token saved" });
}

/** Sent when the parent changes language, so push copy follows them. */
export async function updateLocale(req: Request, res: Response) {
  const { locale } = req.body as { locale?: string };
  if (locale !== "en" && locale !== "ar" && locale !== "he") {
    return res.status(400).json({ message: "locale must be en, ar or he" });
  }
  await UserModel.updateLocale(req.userId!, locale);
  res.json({ message: "Locale saved" });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const user = await UserModel.findById(req.userId!);
  if (!user?.passwordHash) {
    return res.status(404).json({ message: "User not found" });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await UserModel.updatePassword(user.id, passwordHash);
  res.json({ message: "Password updated" });
}

/**
 * Own display name only. This endpoint used to accept `childNames`, which let
 * any parent grant themselves access to photos of any child sharing that name
 * — children are now linked by an admin through the students API.
 */
export async function updateMe(req: Request, res: Response) {
  const { name } = req.body as { name?: string };

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const user = await UserModel.updateName(req.userId!, name.trim());
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: await UserModel.toPublic(user) });
}
