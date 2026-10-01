import { Student as PrismaStudent } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Student = PrismaStudent;

type CreateStudentInput = {
  name: string;
  birthDate?: string | null;
  notes?: string | null;
  guardianPhone?: string | null;
  nationalId?: string | null;
  groupName?: string | null;
  motherName?: string | null;
  /** E.164, already checked — see parseFamilyInput. */
  motherPhone?: string | null;
  fatherPhone?: string | null;
};

/** The numbers sign-in matches on: always exactly the mother's and father's. */
function guardianPhonesOf(motherPhone?: string | null, fatherPhone?: string | null): string[] {
  return [...new Set([motherPhone, fatherPhone].filter((phone): phone is string => !!phone))];
}

/** Thrown when another child already has this ID number. */
export class DuplicateNationalIdError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export const StudentModel = {
  async create(input: CreateStudentInput): Promise<Student> {
    try {
      return await prisma.student.create({
        data: {
          name: input.name.trim(),
          birthDate: input.birthDate ?? null,
          notes: input.notes ?? null,
          guardianPhone: input.guardianPhone ?? null,
          nationalId: input.nationalId ?? null,
          groupName: input.groupName ?? null,
          motherName: input.motherName ?? null,
          motherPhone: input.motherPhone ?? null,
          fatherPhone: input.fatherPhone ?? null,
          guardianPhones: guardianPhonesOf(input.motherPhone, input.fatherPhone),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateNationalIdError();
      throw error;
    }
  },

  /** Null when the child doesn't exist. Throws DuplicateNationalIdError. */
  async update(id: string, input: Partial<CreateStudentInput>): Promise<Student | null> {
    const current = await prisma.student.findUnique({ where: { id } });
    if (!current) return null;

    const motherPhone = input.motherPhone !== undefined ? input.motherPhone : current.motherPhone;
    const fatherPhone = input.fatherPhone !== undefined ? input.fatherPhone : current.fatherPhone;
    const pick = <K extends keyof CreateStudentInput>(key: K) =>
      input[key] !== undefined ? { [key]: key === "name" ? String(input[key]).trim() : input[key] } : {};

    try {
      return await prisma.student.update({
        where: { id },
        data: {
          ...pick("name"),
          ...pick("birthDate"),
          ...pick("notes"),
          ...pick("guardianPhone"),
          ...pick("nationalId"),
          ...pick("groupName"),
          ...pick("motherName"),
          motherPhone,
          fatherPhone,
          guardianPhones: guardianPhonesOf(motherPhone, fatherPhone),
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateNationalIdError();
      throw error;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.student.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async findById(id: string): Promise<Student | null> {
    return prisma.student.findUnique({ where: { id } });
  },

  /** Names already on the roster, lowercased, for de-duplicating a paste import. */
  async existingNames(): Promise<Set<string>> {
    const students = await prisma.student.findMany({ select: { name: true } });
    return new Set(students.map((student) => student.name.trim().toLowerCase()));
  },

  async listAll(): Promise<Student[]> {
    return prisma.student.findMany({ orderBy: { name: "asc" } });
  },

  /**
   * Students with their guardians in a single query. The admin list used to
   * run one guardian lookup per student, which is fine for eight children and
   * ruinous for several hundred.
   */
  async listWithGuardians({
    search,
    limit = 50,
    offset = 0,
  }: { search?: string; limit?: number; offset?: number } = {}) {
    // By child's name, mother's name or ID number.
    const term = search?.trim();
    const where = term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { motherName: { contains: term, mode: "insensitive" as const } },
            { nationalId: { contains: term } },
          ],
        }
      : {};

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        include: {
          guardians: {
            include: { parent: { select: { id: true, name: true, email: true, phone: true } } },
          },
          _count: { select: { tags: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      total,
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        birthDate: student.birthDate,
        notes: student.notes,
        addedByParent: student.addedByParent,
        guardianPhones: student.guardianPhones,
        nationalId: student.nationalId,
        groupName: student.groupName,
        motherName: student.motherName,
        motherPhone: student.motherPhone,
        fatherPhone: student.fatherPhone,
        photoCount: student._count.tags,
        // Phone sign-ups have no email; the number is how the admin knows them.
        guardians: student.guardians.map(({ parent }) => ({
          id: parent.id,
          name: parent.name,
          email: parent.email ?? parent.phone,
        })),
      })),
    };
  },

  async listByIds(ids: string[]): Promise<Student[]> {
    if (ids.length === 0) return [];
    return prisma.student.findMany({ where: { id: { in: ids } } });
  },

  /** The children this parent is a guardian of. */
  async listByParent(parentId: string): Promise<Student[]> {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    });
    return links.map((link) => link.student);
  },

  async listGuardians(studentId: string) {
    const links = await prisma.parentStudent.findMany({
      where: { studentId },
      include: { parent: true },
    });
    return links.map((link) => link.parent);
  },

  /** Idempotent — re-linking an existing guardian is a no-op, not an error. */
  async linkParent(parentId: string, studentId: string): Promise<void> {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {},
    });
  },

  /**
   * Also takes the parent's number off the child: otherwise their next
   * sign-in would match it and link them straight back.
   */
  async unlinkParent(parentId: string, studentId: string): Promise<void> {
    await prisma.parentStudent
      .delete({ where: { parentId_studentId: { parentId, studentId } } })
      .catch(() => undefined);

    const [parent, student] = await Promise.all([
      prisma.user.findUnique({ where: { id: parentId }, select: { phone: true } }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { motherPhone: true, fatherPhone: true },
      }),
    ]);
    if (!parent?.phone || !student) return;
    const motherPhone = student.motherPhone === parent.phone ? null : student.motherPhone;
    const fatherPhone = student.fatherPhone === parent.phone ? null : student.fatherPhone;
    if (motherPhone !== student.motherPhone || fatherPhone !== student.fatherPhone) {
      await prisma.student.update({
        where: { id: studentId },
        data: { motherPhone, fatherPhone, guardianPhones: guardianPhonesOf(motherPhone, fatherPhone) },
      });
    }
  },

  /** Children who list this number as a guardian's. Read-only. */
  async findByGuardianPhone(phone: string) {
    return prisma.student.findMany({
      where: { guardianPhones: { has: phone } },
      select: { id: true, name: true, motherName: true, motherPhone: true, fatherPhone: true },
      orderBy: { name: "asc" },
    });
  },

  /**
   * Links this account to every child that lists its (verified) number.
   * Safe to repeat: existing links are left alone.
   */
  async linkByPhone(parentId: string, phone: string): Promise<{ id: string; name: string }[]> {
    const children = await StudentModel.findByGuardianPhone(phone);
    for (const child of children) await StudentModel.linkParent(parentId, child.id);
    return children;
  },

  /**
   * After an admin saves a child's numbers: links any parent who already has
   * an account under one of them, so they don't have to sign in again first.
   */
  async linkAccountsWithPhones(studentId: string, phones: string[]): Promise<void> {
    if (phones.length === 0) return;
    const parents = await prisma.user.findMany({
      where: { phone: { in: phones } },
      select: { id: true },
    });
    for (const parent of parents) await StudentModel.linkParent(parent.id, studentId);
  },

  /** Dashboard counters. All COUNT queries — nothing is loaded into memory. */
  async adminCounts() {
    const [
      students,
      parents,
      unlinkedStudents,
      events,
      photos,
      pendingRequests,
      courses,
      unreadFeedback,
    ] = await Promise.all([
        prisma.student.count(),
        prisma.user.count({ where: { role: "parent" } }),
        prisma.student.count({ where: { guardians: { none: {} } } }),
        prisma.event.count(),
        prisma.photo.count(),
        prisma.courseEnrollment.count({ where: { status: "pending" } }),
        prisma.course.count({ where: { isActive: true } }),
        prisma.feedback.count({ where: { readAt: null } }),
      ]);
    return {
      students,
      parents,
      unlinkedStudents,
      events,
      photos,
      pendingRequests,
      courses,
      unreadFeedback,
    };
  },

  /** Student ids this parent may see photos of — the core visibility rule. */
  async visibleStudentIds(parentId: string): Promise<string[]> {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((link) => link.studentId);
  },

  /** How many children this parent is linked to, however they were linked. */
  async countForParent(parentId: string): Promise<number> {
    return prisma.parentStudent.count({ where: { parentId } });
  },

  /**
   * A parent adds a child of their own (a course family's second child). The
   * record and the link are created together, and marked as parent-added so
   * the admin can tell them apart from the roster.
   */
  async createForParent(
    parentId: string,
    child: { name: string; birthDate: string }
  ): Promise<Student> {
    return prisma.student.create({
      data: {
        name: child.name,
        birthDate: child.birthDate,
        addedByParent: true,
        guardians: { create: { parentId } },
      },
    });
  },
};
