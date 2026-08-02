import { randomUUID } from "crypto";

export type Role = "admin" | "parent";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  googleId: string | null;
  role: Role;
  childNames: string[];
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash" | "googleId">;

const usersById = new Map<string, User>();
const usersByEmail = new Map<string, string>();

type CreateUserInput = {
  email: string;
  name: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: Role;
  childNames?: string[];
};

export const UserModel = {
  create(input: CreateUserInput): User {
    const user: User = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash ?? null,
      googleId: input.googleId ?? null,
      role: input.role ?? "parent",
      childNames: input.childNames ?? [],
      createdAt: new Date().toISOString(),
    };
    usersById.set(user.id, user);
    usersByEmail.set(user.email, user.id);
    return user;
  },

  findById(id: string): User | undefined {
    return usersById.get(id);
  },

  findByEmail(email: string): User | undefined {
    const id = usersByEmail.get(email.toLowerCase());
    return id ? usersById.get(id) : undefined;
  },

  updateChildNames(id: string, childNames: string[]): User | undefined {
    const user = usersById.get(id);
    if (!user) return undefined;
    user.childNames = childNames;
    return user;
  },

  toPublic(user: User): PublicUser {
    const { passwordHash: _passwordHash, googleId: _googleId, ...publicUser } = user;
    return publicUser;
  },
};
