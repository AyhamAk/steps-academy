import { Event as PrismaEvent } from "@prisma/client";

import { prisma } from "../lib/prisma";

export type Event = PrismaEvent;

type CreateEventInput = {
  name: string;
  date: string;
  attendees: string[];
  createdBy: string;
};

export const DEFAULT_PAGE_SIZE = 50;

export const EventModel = {
  async create(input: CreateEventInput): Promise<Event> {
    return prisma.event.create({
      data: {
        name: input.name,
        date: input.date,
        attendees: input.attendees,
        createdBy: input.createdBy,
      },
    });
  },

  async findById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({ where: { id } });
  },

  async listAll(limit = DEFAULT_PAGE_SIZE, offset = 0): Promise<Event[]> {
    return prisma.event.findMany({
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });
  },

  /** The soonest event whose date hasn't passed yet, if any. */
  async findNext(): Promise<Event | null> {
    const todayIso = new Date().toISOString().slice(0, 10);
    return prisma.event.findFirst({
      where: { date: { gte: todayIso } },
      orderBy: { date: "asc" },
    });
  },
};
