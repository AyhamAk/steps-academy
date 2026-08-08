import { Role, User as PrismaUser } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type { Role };
export type User = PrismaUser;
export type PublicUser = Omit<User, "passwordHash" | "googleId" | "pushToken">;

type CreateUserInput = {
  email: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: Role;
  childNames?: string[];
};

export const UserModel = {
  async create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        role: input.role ?? "parent",
        childNames: input.childNames ?? [],
      },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  async updateChildNames(id: string, childNames: string[]): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: { childNames } });
    } catch {
      return null;
    }
  },

  async updatePassword(id: string, passwordHash: string): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: { passwordHash } });
    } catch {
      return null;
    }
  },

  /** `token: null` clears it — used on logout so a stale device stops receiving pushes. */
  async updatePushToken(id: string, pushToken: string | null): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: { pushToken } });
    } catch {
      return null;
    }
  },

  async listParents(): Promise<User[]> {
    return prisma.user.findMany({ where: { role: "parent" } });
  },

  toPublic(user: User): PublicUser {
    const {
      passwordHash: _passwordHash,
      googleId: _googleId,
      pushToken: _pushToken,
      ...publicUser
    } = user;
    return publicUser;
  },
};
