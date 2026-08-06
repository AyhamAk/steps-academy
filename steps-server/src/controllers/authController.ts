import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env";
import { UserModel } from "../models/user";
import { signToken } from "../utils/jwt";

const googleClient = new OAuth2Client(env.googleClientId);

/** Trim names, drop empties, and dedupe case-insensitively (first spelling wins). */
function cleanChildNames(childNames: unknown): string[] {
  if (!Array.isArray(childNames)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of childNames) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export async function register(req: Request, res: Response) {
  const { email, name, password, childNames } = req.body as {
    email?: string;
    name?: string;
    password?: string;
    childNames?: string[];
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
  const user = await UserModel.create({
    email,
    name,
    passwordHash,
    role,
    childNames: cleanChildNames(childNames),
  });
  const token = signToken({ userId: user.id });

  res.status(201).json({ token, user: UserModel.toPublic(user) });
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
  res.json({ token, user: UserModel.toPublic(user) });
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
    res.json({ token, user: UserModel.toPublic(user) });
  } catch {
    res.status(401).json({ message: "Google token verification failed" });
  }
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: UserModel.toPublic(user) });
}

export function logout(_req: Request, res: Response) {
  res.json({ message: "Logged out" });
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

export async function updateMe(req: Request, res: Response) {
  const { childNames } = req.body as { childNames?: string[] };

  if (!Array.isArray(childNames) || !childNames.every((n) => typeof n === "string")) {
    return res.status(400).json({ message: "childNames must be an array of strings" });
  }

  const user = await UserModel.updateChildNames(req.userId!, cleanChildNames(childNames));
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: UserModel.toPublic(user) });
}
