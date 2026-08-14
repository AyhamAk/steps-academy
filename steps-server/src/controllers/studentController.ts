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
  guardianPhone?: string | null;
}) {
  return {
    id: student.id,
    name: student.name,
    birthDate: student.birthDate,
    notes: student.notes,
    guardianPhone: student.guardianPhone ?? null,
  };
}

function paging(req: Request) {
  return {
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    limit: Math.min(Number(req.query.limit) || 50, 100),
    offset: Math.max(Number(req.query.offset) || 0, 0),
  };
}

/** Admin: students with their guardians, searchable by name and paged. */
export async function listStudents(req: Request, res: Response) {
  res.json(await StudentModel.listWithGuardians(paging(req)));
}

export async function createStudent(req: Request, res: Response) {
  const { name, birthDate, notes, guardianPhone } = req.body as {
    name?: string;
    birthDate?: string | null;
    notes?: string | null;
    guardianPhone?: string | null;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const student = await StudentModel.create({
    name,
    birthDate: birthDate?.trim() || null,
    notes: notes?.trim() || null,
    guardianPhone: guardianPhone?.trim() || null,
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

/** Admin: parent accounts with their children, searchable by name or email. */
export async function listParents(req: Request, res: Response) {
  res.json(await UserModel.listParentsWithChildren(paging(req)));
}

/** Counts for the admin dashboard — all aggregates, nothing loaded into memory. */
export async function adminOverview(_req: Request, res: Response) {
  const [counts, awaitingLink] = await Promise.all([
    StudentModel.adminCounts(),
    UserModel.listAwaitingLink(),
  ]);
  res.json({ ...counts, parentsAwaitingLink: awaitingLink.length });
}

/** Parents with no child linked yet, newest first. */
export async function listAwaitingLink(_req: Request, res: Response) {
  res.json({ parents: await UserModel.listAwaitingLink() });
}

/**
 * Paste-import a whole class. Entering sixty children one at a time was
 * already the slowest part of setting up a term, and it's the prerequisite for
 * sending sixty invite codes.
 *
 * Skips names already on the roster rather than erroring, so pasting the same
 * list twice is harmless — an admin who isn't sure whether the first paste
 * worked can simply do it again.
 */
export async function bulkCreateStudents(req: Request, res: Response) {
  const { students } = req.body as {
    students?: { name?: string; phone?: string | null }[];
  };

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: "students must be a non-empty array" });
  }

  const existing = await StudentModel.existingNames();
  const created: unknown[] = [];
  let skipped = 0;

  for (const entry of students) {
    const name = entry?.name?.trim();
    if (!name) continue;
    // Guard within the batch too: a pasted list can repeat a name itself.
    if (existing.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    existing.add(name.toLowerCase());
    const student = await StudentModel.create({
      name,
      guardianPhone: entry.phone?.trim() || null,
    });
    created.push({ ...serializeStudent(student), guardians: [] });
  }

  res.status(201).json({ created, createdCount: created.length, skippedCount: skipped });
}
