import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env";
import { UserModel } from "../models/user";
import { signToken } from "../utils/jwt";

const googleClient = new OAuth2Client(env.googleClientId);

export async function register(req: Request, res: Response) {
  const { email, name, password } = req.body as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!email || !name || !password) {
    return res.status(400).json({ message: "email, name and password are required" });
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
  // A new account starts with no children. An admin links them to real Student
  // records — a parent can no longer grant themselves access by typing a name.
  const user = await UserModel.create({ email, name, passwordHash, role });
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
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    let user = await UserModel.findByEmail(payload.email);
    if (!user) {
      const role = env.adminEmails.includes(payload.email.toLowerCase()) ? "admin" : "parent";
      user = await UserModel.create({
        email: payload.email,
        name: payload.name ?? payload.email,
        googleId: payload.sub,
        role,
      });
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

export async function updatePushToken(req: Request, res: Response) {
  const { pushToken } = req.body as { pushToken?: string };
  if (!pushToken || typeof pushToken !== "string") {
    return res.status(400).json({ message: "pushToken is required" });
  }
  await UserModel.updatePushToken(req.userId!, pushToken);
  res.json({ message: "Push token saved" });
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
