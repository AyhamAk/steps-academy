import { api } from "./api";

export type Guardian = { id: string; name: string; email: string };

export type Student = {
  id: string;
  name: string;
  birthDate: string | null;
  notes: string | null;
  photoCount: number;
  guardians: Guardian[];
};

export type ParentAccount = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  /** What they said their child is called at sign-up — a hint, not access. */
  claimedChildName: string | null;
  children: { id: string; name: string }[];
};

export type ParentAwaitingLink = {
  id: string;
  name: string;
  email: string;
  claimedChildName: string | null;
  createdAt: string;
};

export type AdminOverview = {
  students: number;
  parents: number;
  /** Children with no parent linked — they can't see their own photos yet. */
  unlinkedStudents: number;
  events: number;
  photos: number;
  pendingRequests: number;
  /** Parents who signed up but have no child linked yet. */
  parentsAwaitingLink: number;
  courses: number;
};

type PageQuery = { search?: string; limit?: number; offset?: number };

export async function listStudents(query: PageQuery = {}) {
  const { data } = await api.get<{ students: Student[]; total: number }>("/api/students", {
    params: query,
  });
  return data;
}

export async function adminOverview() {
  const { data } = await api.get<AdminOverview>("/api/students/overview");
  return data;
}

export async function createStudent(input: {
  name: string;
  birthDate?: string | null;
  notes?: string | null;
}) {
  const { data } = await api.post<{ student: Student }>("/api/students", input);
  return data.student;
}

export async function updateStudent(
  studentId: string,
  input: { name?: string; birthDate?: string | null; notes?: string | null }
) {
  const { data } = await api.patch<{ student: Omit<Student, "guardians"> }>(
    `/api/students/${studentId}`,
    input
  );
  return data.student;
}

export async function deleteStudent(studentId: string) {
  await api.delete(`/api/students/${studentId}`);
}

export async function linkGuardian(studentId: string, parentId: string) {
  const { data } = await api.post<{ guardians: Guardian[] }>(
    `/api/students/${studentId}/guardians`,
    { parentId }
  );
  return data.guardians;
}

export async function unlinkGuardian(studentId: string, parentId: string) {
  const { data } = await api.delete<{ guardians: Guardian[] }>(
    `/api/students/${studentId}/guardians/${parentId}`
  );
  return data.guardians;
}

export async function listAwaitingLink() {
  const { data } = await api.get<{ parents: ParentAwaitingLink[] }>("/api/students/awaiting-link");
  return data.parents;
}

export async function listParents(query: PageQuery = {}) {
  const { data } = await api.get<{ parents: ParentAccount[]; total: number }>(
    "/api/students/parents/all",
    { params: query }
  );
  return data;
}

/** Paste-import a class. Names already on the roster are skipped, not errored. */
export async function bulkCreateStudents(students: { name: string; phone: string | null }[]) {
  const { data } = await api.post<{ createdCount: number; skippedCount: number }>(
    "/api/students/bulk",
    { students }
  );
  return data;
}
