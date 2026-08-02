import { randomUUID } from "crypto";

export type Event = {
  id: string;
  name: string;
  date: string;
  attendees: string[];
  createdBy: string;
  createdAt: string;
};

const eventsById = new Map<string, Event>();

type CreateEventInput = {
  name: string;
  date: string;
  attendees: string[];
  createdBy: string;
};

export const EventModel = {
  create(input: CreateEventInput): Event {
    const event: Event = {
      id: randomUUID(),
      name: input.name,
      date: input.date,
      attendees: input.attendees,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    eventsById.set(event.id, event);
    return event;
  },

  findById(id: string): Event | undefined {
    return eventsById.get(id);
  },

  listAll(): Event[] {
    return [...eventsById.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  /** The soonest event whose date hasn't passed yet, if any. */
  findNext(): Event | undefined {
    const todayIso = new Date().toISOString().slice(0, 10);
    return [...eventsById.values()]
      .filter((event) => event.date >= todayIso)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  },
};
