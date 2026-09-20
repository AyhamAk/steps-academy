import { Role, User as PrismaUser } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type { Role };
export type User = PrismaUser;
/** `birthDate` drives the age band Home labels the child with. */
export type PublicChild = { id: string; name: string; birthDate: string | null };
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
  claimedChildName?: string | null;
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
        claimedChildName: input.claimedChildName ?? null,
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
  /** Records that an existing account has been linked to a Google identity. */
  async linkGoogleId(id: string, googleId: string): Promise<void> {
    try {
      await prisma.user.update({ where: { id }, data: { googleId } });
    } catch {
      // Losing the link is not worth failing the sign-in over.
    }
  },

  async updateLocale(id: string, locale: string): Promise<void> {
    try {
      await prisma.user.update({ where: { id }, data: { locale } });
    } catch {
      // A missing user just means nothing to record.
    }
  },

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

  /** Hard delete. Cascades are declared in the schema, not here. */
  async remove(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  },

  /** Full user rows for a set of ids — push needs the token, not just the id. */
  async listByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return prisma.user.findMany({ where: { id: { in: ids } } });
  },

  async listAdmins(): Promise<User[]> {
    return prisma.user.findMany({ where: { role: "admin" } });
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
        // What they said their child is called at sign-up — shown to the admin
        // as a hint for who to link, never as access.
        claimedChildName: parent.claimedChildName,
        children: parent.children.map((link) => link.student),
      })),
    };
  },

  /**
   * Every account, admins included — the control panel's user list.
   *
   * Deliberately separate from `listParentsWithChildren`: that one is the
   * app's roster screen and must never surface an admin, while the panel has
   * to be able to find and demote one.
   */
  async listAllWithChildren({
    search,
    limit = 50,
    offset = 0,
  }: { search?: string; limit?: number; offset?: number } = {}) {
    const term = search?.trim();
    const where = term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { email: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ role: "asc" }, { name: "asc" }],
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
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        claimedChildName: user.claimedChildName,
        hasPassword: Boolean(user.passwordHash),
        children: user.children.map((link) => link.student),
      })),
    };
  },

  async setRole(id: string, role: Role): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: { role } });
    } catch {
      return null;
    }
  },

  /**
   * What would block deleting this account.
   *
   * These five relations are `Restrict` in the schema, so Postgres refuses the
   * delete while any row points at the user. Counting them first is the only
   * way to tell an admin *why* a delete will fail instead of handing them a
   * foreign-key error.
   */
  async ownedContentCounts(id: string) {
    const [events, photos, announcements, invites, tips] = await Promise.all([
      prisma.event.count({ where: { createdBy: id } }),
      prisma.photo.count({ where: { uploadedBy: id } }),
      prisma.announcement.count({ where: { createdBy: id } }),
      prisma.inviteCode.count({ where: { createdBy: id } }),
      prisma.tip.count({ where: { createdBy: id } }),
    ]);
    return {
      events,
      photos,
      announcements,
      invites,
      tips,
      total: events + photos + announcements + invites + tips,
    };
  },

  /**
   * Moves everything that blocks a delete onto another admin, in one
   * transaction so a half-reassigned account can never be left behind.
   */
  async reassignContent(fromId: string, toId: string): Promise<void> {
    await prisma.$transaction([
      prisma.event.updateMany({ where: { createdBy: fromId }, data: { createdBy: toId } }),
      prisma.photo.updateMany({ where: { uploadedBy: fromId }, data: { uploadedBy: toId } }),
      prisma.announcement.updateMany({ where: { createdBy: fromId }, data: { createdBy: toId } }),
      prisma.inviteCode.updateMany({ where: { createdBy: fromId }, data: { createdBy: toId } }),
      prisma.tip.updateMany({ where: { createdBy: fromId }, data: { createdBy: toId } }),
    ]);
  },

  /** Parents who signed up but have no child linked yet — the admin's to-do list. */
  async listAwaitingLink() {
    const parents = await prisma.user.findMany({
      where: { role: "parent", children: { none: {} } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, claimedChildName: true, createdAt: true },
    });
    return parents;
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
      include: { student: { select: { id: true, name: true, birthDate: true } } },
      orderBy: { student: { name: "asc" } },
    });
    return { ...rest, children: links.map((link) => link.student) };
  },
};
