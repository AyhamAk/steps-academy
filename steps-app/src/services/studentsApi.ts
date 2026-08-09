import { api } from "./api";

export type Guardian = { id: string; name: string; email: string };

export type Student = {
  id: string;
  name: string;
  birthDate: string | null;
  notes: string | null;
  guardians: Guardian[];
};

export type ParentAccount = {
  id: string;
  name: string;
  email: string;
  children: { id: string; name: string }[];
};

export async function listStudents() {
  const { data } = await api.get<{ students: Student[] }>("/api/students");
  return data.students;
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

export async function listParents() {
  const { data } = await api.get<{ parents: ParentAccount[] }>("/api/students/parents/all");
  return data.parents;
}
