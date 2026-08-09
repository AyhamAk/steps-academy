import { Role, User as PrismaUser } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type { Role };
export type User = PrismaUser;
export type PublicChild = { id: string; name: string };
export type PublicUser = Omit<User, "passwordHash" | "googleId" | "pushToken"> & {
  /** Children this account is a guardian of. Admin-assigned, never self-declared. */
  children: PublicChild[];
};

type CreateUserInput = {
  email: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: Role;
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
      },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  async updateName(id: string, name: string): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: { name } });
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

  /** Parents with their linked children in one query, searchable and paged. */
  async listParentsWithChildren({
    search,
    limit = 50,
    offset = 0,
  }: { search?: string; limit?: number; offset?: number } = {}) {
    const term = search?.trim();
    const where = {
      role: "parent" as const,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [parents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        include: {
          children: { include: { student: { select: { id: true, name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      total,
      parents: parents.map((parent) => ({
        id: parent.id,
        name: parent.name,
        email: parent.email,
        createdAt: parent.createdAt,
        children: parent.children.map((link) => link.student),
      })),
    };
  },

  /** Always goes through the DB for children, so a client can never be told
   *  about a child this account isn't actually linked to. */
  async toPublic(user: User): Promise<PublicUser> {
    const {
      passwordHash: _passwordHash,
      googleId: _googleId,
      pushToken: _pushToken,
      ...rest
    } = user;
    const links = await prisma.parentStudent.findMany({
      where: { parentId: user.id },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { student: { name: "asc" } },
    });
    return { ...rest, children: links.map((link) => link.student) };
  },
};
