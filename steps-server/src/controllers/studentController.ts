import { Request, Response } from "express";

import { StudentModel } from "../models/student";
import { UserModel } from "../models/user";

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

function serializeStudent(student: {
  id: string;
  name: string;
  birthDate: string | null;
  notes: string | null;
}) {
  return {
    id: student.id,
    name: student.name,
    birthDate: student.birthDate,
    notes: student.notes,
  };
}

/** Admin: every student, each with their linked guardians. */
export async function listStudents(_req: Request, res: Response) {
  const students = await StudentModel.listAll();
  const withGuardians = await Promise.all(
    students.map(async (student) => ({
      ...serializeStudent(student),
      guardians: (await StudentModel.listGuardians(student.id)).map((guardian) => ({
        id: guardian.id,
        name: guardian.name,
        email: guardian.email,
      })),
    }))
  );
  res.json({ students: withGuardians });
}

export async function createStudent(req: Request, res: Response) {
  const { name, birthDate, notes } = req.body as {
    name?: string;
    birthDate?: string | null;
    notes?: string | null;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const student = await StudentModel.create({
    name,
    birthDate: birthDate?.trim() || null,
    notes: notes?.trim() || null,
  });
  res.status(201).json({ student: { ...serializeStudent(student), guardians: [] } });
}

export async function updateStudent(req: Request, res: Response) {
  const { name, birthDate, notes } = req.body as {
    name?: string;
    birthDate?: string | null;
    notes?: string | null;
  };

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "name cannot be empty" });
  }

  const student = await StudentModel.update(param(req, "studentId"), {
    ...(name !== undefined ? { name } : {}),
    ...(birthDate !== undefined ? { birthDate: birthDate?.trim() || null } : {}),
    ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
  });
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }
  res.json({ student: serializeStudent(student) });
}

/** Cascades to that student's photo tags, event attendance and parent links. */
export async function deleteStudent(req: Request, res: Response) {
  const removed = await StudentModel.remove(param(req, "studentId"));
  if (!removed) {
    return res.status(404).json({ message: "Student not found" });
  }
  res.json({ message: "Student deleted" });
}

/**
 * Links a parent account to a child. This is the only way a parent gains
 * access to a child's photos, and only an admin can call it.
 */
export async function linkGuardian(req: Request, res: Response) {
  const { parentId } = req.body as { parentId?: string };
  if (!parentId || typeof parentId !== "string") {
    return res.status(400).json({ message: "parentId is required" });
  }

  const studentId = param(req, "studentId");
  const [student, parent] = await Promise.all([
    StudentModel.findById(studentId),
    UserModel.findById(parentId),
  ]);
  if (!student) return res.status(404).json({ message: "Student not found" });
  if (!parent) return res.status(404).json({ message: "Parent not found" });

  await StudentModel.linkParent(parent.id, student.id);
  const guardians = await StudentModel.listGuardians(student.id);
  res.json({
    guardians: guardians.map((g) => ({ id: g.id, name: g.name, email: g.email })),
  });
}

export async function unlinkGuardian(req: Request, res: Response) {
  const studentId = param(req, "studentId");
  await StudentModel.unlinkParent(param(req, "parentId"), studentId);
  const guardians = await StudentModel.listGuardians(studentId);
  res.json({
    guardians: guardians.map((g) => ({ id: g.id, name: g.name, email: g.email })),
  });
}

/** Admin: parent accounts, for picking a guardian to link. */
export async function listParents(_req: Request, res: Response) {
  const parents = await UserModel.listParents();
  const withChildren = await Promise.all(
    parents.map(async (parent) => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      children: (await StudentModel.listByParent(parent.id)).map((child) => ({
        id: child.id,
        name: child.name,
      })),
    }))
  );
  res.json({ parents: withChildren });
}
