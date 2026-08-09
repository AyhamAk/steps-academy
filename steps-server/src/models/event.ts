import { Event as PrismaEvent, Student } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Event = PrismaEvent;
export type EventWithAttendees = Event & { attendees: Student[] };

type CreateEventInput = {
  name: string;
  date: string;
  attendeeIds: string[];
  createdBy: string;
};

export const DEFAULT_PAGE_SIZE = 50;

function withAttendees(
  event: PrismaEvent & { attendees: { student: Student }[] }
): EventWithAttendees {
  const { attendees, ...rest } = event;
  return { ...rest, attendees: attendees.map((link) => link.student) };
}

const includeAttendees = { attendees: { include: { student: true } } } as const;

export const EventModel = {
  async create(input: CreateEventInput): Promise<EventWithAttendees> {
    const event = await prisma.event.create({
      data: {
        name: input.name,
        date: input.date,
        createdBy: input.createdBy,
        attendees: {
          create: input.attendeeIds.map((studentId) => ({ studentId })),
        },
      },
      include: includeAttendees,
    });
    return withAttendees(event);
  },

  async findById(id: string): Promise<EventWithAttendees | null> {
    const event = await prisma.event.findUnique({ where: { id }, include: includeAttendees });
    return event ? withAttendees(event) : null;
  },

  async listAll(limit = DEFAULT_PAGE_SIZE, offset = 0): Promise<EventWithAttendees[]> {
    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: includeAttendees,
    });
    return events.map(withAttendees);
  },

  /**
   * Events with their photo counts, counted in the database rather than by
   * loading every photo row — the old version fetched up to 1000 photos per
   * event just to call `.length` on the result.
   */
  async listWithPhotoCounts(limit = DEFAULT_PAGE_SIZE, offset = 0) {
    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: { ...includeAttendees, _count: { select: { photos: true } } },
    });
    return events.map((event) => ({
      ...withAttendees(event),
      photoCount: event._count.photos,
    }));
  },

  async updateCaption(id: string, caption: string | null): Promise<EventWithAttendees | null> {
    try {
      const event = await prisma.event.update({
        where: { id },
        data: { caption },
        include: includeAttendees,
      });
      return withAttendees(event);
    } catch {
      return null;
    }
  },

  async setAttendees(id: string, attendeeIds: string[]): Promise<EventWithAttendees | null> {
    try {
      const event = await prisma.event.update({
        where: { id },
        data: {
          attendees: {
            deleteMany: {},
            create: attendeeIds.map((studentId) => ({ studentId })),
          },
        },
        include: includeAttendees,
      });
      return withAttendees(event);
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.event.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** The soonest event whose date hasn't passed yet, if any. */
  async findNext(): Promise<Event | null> {
    const todayIso = new Date().toISOString().slice(0, 10);
    return prisma.event.findFirst({
      where: { date: { gte: todayIso } },
      orderBy: { date: "asc" },
    });
  },

  /** Events a given set of students attended — drives the parent gallery. */
  async listForStudents(studentIds: string[], limit = DEFAULT_PAGE_SIZE, offset = 0) {
    if (studentIds.length === 0) return [];
    const events = await prisma.event.findMany({
      where: { photos: { some: { tags: { some: { studentId: { in: studentIds } } } } } },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });
    return events;
  },
};
