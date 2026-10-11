import { prisma } from "../lib/prisma";

/**
 * What families do in the app, read back out of AnalyticsEvent.
 *
 * Shared by the Users, Usage and album pages. Everything is derived from
 * events the app already sends: screen views carry the route, and the
 * gallery, viewer and course screens send their own. Server-side
 * `api_request` rows are left out — they describe the API, not the person.
 */

const q = <T>(sql: string, ...params: unknown[]) => prisma.$queryRawUnsafe<T[]>(sql, ...params);

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** A gap this long between two events starts a new visit. */
const VISIT_GAP_MS = 30 * 60 * 1000;

const SCREEN_NAMES: Record<string, string> = {
  "/": "Home",
  "/auth": "Sign in",
  "/onboarding": "Sign-up",
  "/profile": "Profile",
  "/gallery": "Gallery",
  "/academy/nursery": "Nursery",
  "/academy/tips": "Tips",
  "/academy/courses": "Courses",
  "/academy/dafi": "Dafi",
  "/notifications": "Notifications",
  "/students": "Students (admin)",
  "/schedule": "Schedule (admin)",
  "/courses": "Courses (admin)",
  "/admin": "Admin",
  "/invite-send": "Invite send (admin)",
  "/course-requests": "Course requests (admin)",
  "/feedback": "Feedback",
};

/** Album names by id, for turning "/gallery/<id>" into the album's name. */
export async function albumNames(): Promise<Map<string, string>> {
  const albums = await prisma.event.findMany({ select: { id: true, name: true } });
  return new Map(albums.map((album) => [album.id, album.name]));
}

/** "/gallery/3f2…" → "Album · Autumn day"; unknown routes come back as they are. */
export function screenName(route: string | null | undefined, albums: Map<string, string>): string {
  if (!route) return "—";
  const album = route.match(new RegExp(`^/gallery/(${UUID})$`));
  if (album) return `Album · ${albums.get(album[1]) ?? "deleted album"}`;
  if (route === "/gallery/:id") return "An album";
  return SCREEN_NAMES[route] ?? route;
}

/** Israel time, whatever the server's own zone is (Railway runs UTC). */
export function israelTime(date: Date | string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", ...opts });
}

function israelDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(date);
}

/** "1h 05m", "4m", "under a minute". */
export function duration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

// ── One person ───────────────────────────────────────────────────────────────

type RawEvent = {
  name: string;
  createdAt: Date;
  platform: string | null;
  appVersion: string | null;
  locale: string | null;
  props: Record<string, unknown> | null;
};

export type VisitStep = {
  screen: string;
  ms: number;
  /** Things done on that screen: "3 photos viewed", "1 saved". */
  notes: string[];
};

export type Visit = { start: Date; end: Date; platform: string | null; steps: VisitStep[] };

export type UserActivity = {
  firstSeen: Date | null;
  lastSeen: Date | null;
  activeDays30: number;
  visits30: number;
  timeInApp30: number;
  device: { platform: string | null; appVersion: string | null; locale: string | null } | null;
  counts: {
    albums: number;
    photosViewed: number;
    photosSaved: number;
    coursesViewed: number;
    courseSignups: number;
    notificationsOpened: number;
  };
  /** Events per day, oldest first, 30 entries. */
  daily: { day: string; n: number }[];
  /** Newest first. */
  visits: Visit[];
};

function splitVisits(events: RawEvent[]): RawEvent[][] {
  const visits: RawEvent[][] = [];
  for (const event of events) {
    const current = visits[visits.length - 1];
    const previous = current?.[current.length - 1];
    if (!previous || event.createdAt.getTime() - previous.createdAt.getTime() > VISIT_GAP_MS) {
      visits.push([event]);
    } else {
      current.push(event);
    }
  }
  return visits;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** The screens of one visit in order, with time on each and what happened there. */
function stepsOf(events: RawEvent[], albums: Map<string, string>): VisitStep[] {
  const steps: (VisitStep & { at: number; viewed: number; saved: number })[] = [];
  const end = events[events.length - 1].createdAt.getTime();

  for (const event of events) {
    const at = event.createdAt.getTime();
    const current = steps[steps.length - 1];
    if (event.name === "screen_view") {
      const route = typeof event.props?.route === "string" ? event.props.route : null;
      // The Home grid also sends a screen_view, with no route; the real one follows.
      if (!route) continue;
      const screen = screenName(route, albums);
      if (current?.screen === screen) continue;
      if (current) current.ms = at - current.at;
      steps.push({ screen, ms: 0, notes: [], at, viewed: 0, saved: 0 });
      continue;
    }
    if (!current) continue;
    if (event.name === "photo_viewer_opened") current.viewed += 1;
    if (event.name === "photo_downloaded") current.saved += 1;
    if (event.name === "course_signup_completed") current.notes.push("signed up for a course");
    if (event.name === "notification_opened") current.notes.push("opened a notification");
  }

  const last = steps[steps.length - 1];
  if (last) last.ms = end - last.at;
  return steps.map(({ screen, ms, notes, viewed, saved }) => ({
    screen,
    ms,
    notes: [
      ...(viewed ? [`opened ${plural(viewed, "photo")}`] : []),
      ...(saved ? [`saved ${saved}`] : []),
      ...notes,
    ],
  }));
}

export async function userActivity(userId: string, maxVisits = 12): Promise<UserActivity> {
  const [bounds, recent, albums] = await Promise.all([
    q<{ first: Date | null; last: Date | null }>(
      `select min("createdAt") first, max("createdAt") last from "AnalyticsEvent"
       where "userId" = $1 and name <> 'api_request'`,
      userId,
    ),
    q<RawEvent>(
      `select name, "createdAt", platform, "appVersion", locale, props from "AnalyticsEvent"
       where "userId" = $1 and name <> 'api_request' and "createdAt" > now() - interval '30 days'
       order by "createdAt" asc limit 8000`,
      userId,
    ),
    albumNames(),
  ]);

  const count = (name: string) => recent.filter((event) => event.name === name).length;
  const days = new Map<string, number>();
  for (const event of recent) {
    const day = israelDay(event.createdAt);
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  const daily = Array.from({ length: 30 }, (_, index) => {
    const day = israelDay(new Date(Date.now() - (29 - index) * 86400000));
    return { day, n: days.get(day) ?? 0 };
  });

  const grouped = splitVisits(recent);
  const visits = grouped
    .slice(-maxVisits)
    .reverse()
    .map((events) => ({
      start: events[0].createdAt,
      end: events[events.length - 1].createdAt,
      platform: events[0].platform,
      steps: stepsOf(events, albums),
    }));
  const latest = recent[recent.length - 1];

  return {
    firstSeen: bounds[0]?.first ?? null,
    lastSeen: bounds[0]?.last ?? null,
    activeDays30: days.size,
    visits30: grouped.length,
    timeInApp30: grouped.reduce(
      (sum, events) => sum + (events[events.length - 1].createdAt.getTime() - events[0].createdAt.getTime()),
      0,
    ),
    device: latest
      ? { platform: latest.platform, appVersion: latest.appVersion, locale: latest.locale }
      : null,
    counts: {
      albums: new Set(
        recent.filter((event) => event.name === "album_opened").map((event) => String(event.props?.album_id)),
      ).size,
      photosViewed: count("photo_viewer_opened"),
      photosSaved: count("photo_downloaded"),
      coursesViewed: count("course_viewed"),
      courseSignups: count("course_signup_completed"),
      notificationsOpened: count("notification_opened"),
    },
    daily,
    visits,
  };
}

// ── Everyone ─────────────────────────────────────────────────────────────────

/** Last seen and active days per account, for the Users list. */
export async function lastSeenByUser(): Promise<Map<string, { last: Date; days30: number }>> {
  const rows = await q<{ uid: string; last: Date; days30: number }>(
    `select "userId" uid, max("createdAt") last,
            count(distinct date_trunc('day', "createdAt" at time zone 'Asia/Jerusalem'))
              filter (where "createdAt" > now() - interval '30 days')::int days30
     from "AnalyticsEvent"
     where "userId" is not null and name <> 'api_request'
     group by 1`,
  );
  return new Map(rows.map((row) => [row.uid, { last: row.last, days30: row.days30 }]));
}

export type QuietFamily = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  joined: Date;
  last: Date | null;
  children: string | null;
};

/** Parents who have not opened the app in `days` days, or never have. */
export function quietFamilies(days = 14): Promise<QuietFamily[]> {
  return q<QuietFamily>(
    `select u.id, u.name, u.phone, u.email, u."createdAt" joined, a.last,
            (select string_agg(s.name, ', ' order by s.name) from "ParentStudent" ps
               join "Student" s on s.id = ps."studentId" where ps."parentId" = u.id) children
     from "User" u
     left join (
       select "userId", max("createdAt") last from "AnalyticsEvent"
       where "userId" is not null and name <> 'api_request' group by 1
     ) a on a."userId" = u.id
     where u.role = 'parent' and (a.last is null or a.last < now() - ($1 || ' days')::interval)
     order by a.last asc nulls first, u.name
     limit 200`,
    String(days),
  );
}

/** The most common moves from one screen to the next, last 30 days. */
export async function commonMoves(limit = 14) {
  const rows = await q<{ a: string; b: string; n: number }>(
    `select regexp_replace(props->>'previous_route', '${UUID}', ':id', 'g') a,
            regexp_replace(props->>'route', '${UUID}', ':id', 'g') b,
            count(*)::int n
     from "AnalyticsEvent"
     where name = 'screen_view' and props->>'route' is not null and props->>'previous_route' is not null
       and props->>'route' <> props->>'previous_route'
       and "createdAt" > now() - interval '30 days'
     group by 1, 2 order by n desc limit $1`,
    limit,
  );
  const none = new Map<string, string>();
  return rows.map((row) => ({ from: screenName(row.a, none), to: screenName(row.b, none), n: row.n }));
}

/** Screen views in the last 30 days, by screen, with how many people saw each. */
export async function screenReach(limit = 14) {
  const rows = await q<{ route: string; views: number; people: number }>(
    `select regexp_replace(props->>'route', '${UUID}', ':id', 'g') route,
            count(*)::int views, count(distinct coalesce("userId", "anonId"))::int people
     from "AnalyticsEvent"
     where name = 'screen_view' and props->>'route' is not null
       and "createdAt" > now() - interval '30 days'
     group by 1 order by views desc limit $1`,
    limit,
  );
  const none = new Map<string, string>();
  return rows.map((row) => ({ screen: screenName(row.route, none), views: row.views, people: row.people }));
}

// ── Albums ───────────────────────────────────────────────────────────────────

/**
 * The families who can see an album are the guardians of the children tagged
 * in its photos — photo access follows tags and nothing else.
 */
const AUDIENCE = `
  select p."eventId" eid, ps."parentId" uid
  from "PhotoTag" pt
  join "Photo" p on p.id = pt."photoId"
  join "ParentStudent" ps on ps."studentId" = pt."studentId"
  join "User" u on u.id = ps."parentId" and u.role = 'parent'
  group by 1, 2`;

const OPENED = `
  select props->>'album_id' eid, "userId" uid
  from "AnalyticsEvent"
  where name in ('album_opened', 'photo_viewer_opened', 'photo_downloaded') and "userId" is not null
  group by 1, 2`;

export function albumReach(limit = 12) {
  return q<{ id: string; name: string; date: string; audience: number; reached: number }>(
    `with aud as (${AUDIENCE}), opened as (${OPENED})
     select ev.id, ev.name, ev.date,
            (select count(*) from aud where aud.eid = ev.id)::int audience,
            (select count(*) from aud join opened o on o.eid = aud.eid and o.uid = aud.uid
              where aud.eid = ev.id)::int reached
     from "Event" ev
     where ev."notifiedAt" is not null
     order by ev.date desc, ev."createdAt" desc
     limit $1`,
    limit,
  );
}

export function albumAudience(eventId: string) {
  return q<{
    id: string;
    name: string;
    phone: string | null;
    children: string;
    firstOpen: Date | null;
    opens: number;
    saved: number;
  }>(
    `with aud as (
       select ps."parentId" uid, string_agg(distinct s.name, ', ') children
       from "PhotoTag" pt
       join "Photo" p on p.id = pt."photoId"
       join "ParentStudent" ps on ps."studentId" = pt."studentId"
       join "Student" s on s.id = pt."studentId"
       where p."eventId" = $1
       group by 1
     )
     select u.id, u.name, u.phone, aud.children,
            (select min(e."createdAt") from "AnalyticsEvent" e
              where e."userId" = u.id and e.name in ('album_opened', 'photo_viewer_opened', 'photo_downloaded') and e.props->>'album_id' = $1) "firstOpen",
            (select count(*)::int from "AnalyticsEvent" e
              where e."userId" = u.id and e.name = 'album_opened' and e.props->>'album_id' = $1) opens,
            (select count(*)::int from "AnalyticsEvent" e
              where e."userId" = u.id and e.name = 'photo_downloaded' and e.props->>'album_id' = $1) saved
     from aud join "User" u on u.id = aud.uid and u.role = 'parent'
     order by "firstOpen" asc nulls first, u.name`,
    eventId,
  );
}

// ── Notifications ────────────────────────────────────────────────────────────

/**
 * Each send, with how many recipients have seen it in the app. A send is every
 * notification of one kind about one thing within the same hour — they are
 * written in one go, one row per family.
 */
export async function notificationSends(limit = 15) {
  const [sends, announcements] = await Promise.all([
    q<{
      type: string;
      sent: Date;
      recipients: number;
      seen: number;
      eventName: string | null;
      courseName: string | null;
      tipTitle: string | null;
    }>(
      // Photo notifications from the app carry the album id but not its name.
      `select type::text, min(n."createdAt") sent, count(distinct "userId")::int recipients,
              count(distinct "userId") filter (where read)::int seen,
              coalesce(max("eventName"), max(ev.name)) "eventName",
              max("courseName") "courseName", max("tipTitle") "tipTitle"
       from "Notification" n left join "Event" ev on ev.id = n."eventId"
       group by type, coalesce("eventId", "courseId", "tipId", ''), date_trunc('hour', n."createdAt")
       order by sent desc limit $1`,
      limit,
    ),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 60, select: { text: true, createdAt: true } }),
  ]);

  return sends.map((send) => {
    let about = send.eventName ?? send.courseName ?? send.tipTitle ?? "";
    if (send.type === "announcement") {
      const match = announcements.find(
        (a) => Math.abs(a.createdAt.getTime() - new Date(send.sent).getTime()) < 5 * 60 * 1000,
      );
      about = match?.text ?? "";
    }
    return { ...send, about };
  });
}
