import { api } from "./api";

export type InviteStatus = "active" | "spent" | "revoked" | "expired";

export type Invite = {
  id: string;
  code: string;
  studentId: string;
  studentName: string;
  usesLeft: number;
  status: InviteStatus;
  expiresAt: string | null;
  createdAt: string;
};

/**
 * Checks a code before any account exists, so onboarding can confirm the child
 * by name ("You're connecting to Layla") instead of asking the parent to type
 * it. Throws on an invalid code — the caller shows the message.
 */
export async function checkInviteCode(code: string) {
  const { data } = await api.post<{ studentName: string }>("/api/auth/invite/check", { code });
  return data;
}

/** An already-signed-in parent adding another child. */
export async function redeemInviteCode(code: string) {
  const { data } = await api.post<{ studentName: string }>("/api/invites/redeem", { code });
  return data;
}

export async function createInvite(input: { studentId: string; expiresInDays?: number | null }) {
  const { data } = await api.post<{ invite: Invite }>("/api/invites", input);
  return data.invite;
}

export async function listInvites(studentId?: string) {
  const { data } = await api.get<{ invites: Invite[] }>("/api/invites", {
    params: studentId ? { studentId } : undefined,
  });
  return data.invites;
}

export async function revokeInvite(inviteId: string) {
  await api.delete(`/api/invites/${inviteId}`);
}
