import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import {
  ago,
  barChart,
  escapeHtml,
  flashFrom,
  funnel,
  layout,
  pct,
  statCard,
  table,
} from "../utils/html";

/**
 * The usage page — the panel's original and only read-only tab.
 *
 * Every number below comes from the AnalyticsEvent table. Nothing here can
 * show a photograph, a child, or anything a parent typed, because none of that
 * is ever recorded.
 */

const q = <T>(sql: string, ...params: unknown[]) =>
  prisma.$queryRawUnsafe<T[]>(sql, ...params);

export async function usagePage(req: Request, res: Response) {
  try {
    const [
      liveNow,
      activeToday,
      activeWeek,
      activePrevWeek,
      families,
      children,
      totalEvents,
      firstEvent,
      dailyActives,
      screens,
      tabs,
      inviteAttempts,
      onboardingSteps,
      registrations,
      courseFunnel,
      albums,
      lastSeen,
      clientErrors,
      serverErrors,
      feed,
    ] = await Promise.all([
      q<{ n: number }>(
        `select count(distinct coalesce("userId", "anonId"))::int n from "AnalyticsEvent"
         where "createdAt" > now() - interval '5 minutes'`
      ),
      q<{ n: number }>(
        `select count(distinct coalesce("userId", "anonId"))::int n from "AnalyticsEvent"
         where "createdAt" >= date_trunc('day', now())`
      ),
      q<{ n: number }>(
        `select count(distinct coalesce("userId", "anonId"))::int n from "AnalyticsEvent"
         where "createdAt" > now() - interval '7 days'`
      ),
      q<{ n: number }>(
        `select count(distinct coalesce("userId", "anonId"))::int n from "AnalyticsEvent"
         where "createdAt" > now() - interval '14 days' and "createdAt" <= now() - interval '7 days'`
      ),
      prisma.user.count({ where: { role: "parent" } }),
      prisma.student.count(),
      prisma.analyticsEvent.count(),
      q<{ first: Date | null }>(`select min("createdAt") first from "AnalyticsEvent"`),
      // Neither the series column nor the output column may be called "day" —
      // Postgres rejects it as an alias in both positions, and one syntax
      // error takes the whole page down.
      q<{ label: string; n: number }>(
        `select to_char(d.bucket, 'DD/MM') as label,
                count(distinct coalesce(e."userId", e."anonId"))::int as n
         from generate_series(date_trunc('day', now()) - interval '13 days',
                              date_trunc('day', now()), interval '1 day') as d(bucket)
         left join "AnalyticsEvent" e on date_trunc('day', e."createdAt") = d.bucket
         group by d.bucket order by d.bucket`
      ),
      q<{ route: string; n: number }>(
        `select props->>'route' route, count(*)::int n from "AnalyticsEvent"
         where name = 'screen_view' and props->>'route' is not null
         group by 1 order by n desc limit 12`
      ),
      q<{ tab: string; n: number }>(
        `select props->>'to_tab' tab, count(*)::int n from "AnalyticsEvent"
         where name = 'tab_switch' group by 1 order by n desc limit 8`
      ),
      q<{ success: string; n: number }>(
        `select props->>'success' success, count(*)::int n from "AnalyticsEvent"
         where name = 'invite_code_entered' group by 1`
      ),
      q<{ step: string; n: number }>(
        `select props->>'step' step, count(*)::int n from "AnalyticsEvent"
         where name = 'onboarding_step_completed' group by 1`
      ),
      q<{ n: number }>(
        `select count(*)::int n from "AnalyticsEvent"
         where name = 'api_request' and props->>'route' = '/api/auth/register'
           and props->>'status' = '201'`
      ),
      q<{ name: string; step: string | null; n: number }>(
        `select name, props->>'step' step, count(*)::int n from "AnalyticsEvent"
         where name in ('course_signup_opened','course_signup_completed','course_signup_abandoned')
         group by 1, 2`
      ),
      q<{ album: string; opens: number; ends: number; viewer: number; downloads: number }>(
        `select coalesce(ev.name, a.album_id) album, a.opens, a.ends, a.viewer, a.downloads
         from (
           select props->>'album_id' album_id,
                  count(*) filter (where name = 'album_opened')::int opens,
                  count(*) filter (where name = 'album_scrolled_to_end')::int ends,
                  count(*) filter (where name = 'photo_viewer_opened')::int viewer,
                  count(*) filter (where name = 'photo_downloaded')::int downloads
           from "AnalyticsEvent"
           where props->>'album_id' is not null
           group by 1
         ) a
         left join "Event" ev on ev.id = a.album_id
         order by a.opens desc limit 12`
      ),
      q<{ name: string; email: string; last: Date; events: number }>(
        `select u.name, u.email, max(e."createdAt") last, count(*)::int events
         from "AnalyticsEvent" e join "User" u on u.id = e."userId"
         where u.role = 'parent'
         group by u.id, u.name, u.email
         order by last desc limit 20`
      ),
      q<{ screen: string; type: string; n: number }>(
        `select props->>'screen' screen, props->>'error_type' type, count(*)::int n
         from "AnalyticsEvent" where name = 'client_error'
         group by 1,2 order by n desc limit 10`
      ),
      q<{ route: string; status: string; n: number }>(
        `select props->>'route' route, props->>'status' status, count(*)::int n
         from "AnalyticsEvent"
         where name = 'api_request' and (props->>'status')::int >= 500
         group by 1,2 order by n desc limit 10`
      ),
      q<{ created: Date; name: string; who: string | null; props: unknown }>(
        `select e."createdAt" created, e.name, u.name who, e.props
         from "AnalyticsEvent" e left join "User" u on u.id = e."userId"
         order by e."createdAt" desc limit 150`
      ),
    ]);

    const weekNow = activeWeek[0]?.n ?? 0;
    const weekBefore = activePrevWeek[0]?.n ?? 0;
    const trend =
      weekBefore === 0
        ? weekNow > 0
          ? "first week of data"
          : "no activity yet"
        : `${weekNow >= weekBefore ? "+" : ""}${pct(weekNow - weekBefore, weekBefore)}% vs last week`;

    const inviteOk = Number(inviteAttempts.find((r) => r.success === "true")?.n ?? 0);
    const inviteFail = Number(inviteAttempts.find((r) => r.success === "false")?.n ?? 0);
    const stepCount = (name: string) =>
      Number(onboardingSteps.find((r) => r.step === name)?.n ?? 0);

    const opened = Number(courseFunnel.find((r) => r.name === "course_signup_opened")?.n ?? 0);
    const completed = Number(
      courseFunnel.find((r) => r.name === "course_signup_completed")?.n ?? 0
    );
    const abandonedRows = courseFunnel.filter((r) => r.name === "course_signup_abandoned");
    const abandoned = abandonedRows.reduce((sum, r) => sum + Number(r.n), 0);

    const since = firstEvent[0]?.first;
    const isEmpty = totalEvents === 0;

    const body = `
  ${isEmpty
    ? `<div class="banner banner-warn">No usage recorded yet. Numbers appear here as soon as the app is opened by anyone.</div>`
    : ""}

  <div class="stats">
    ${statCard({ label: "Active right now", value: String(liveNow[0]?.n ?? 0), sub: "last 5 minutes", tone: "var(--forest)" })}
    ${statCard({ label: "Active today", value: String(activeToday[0]?.n ?? 0), sub: "since midnight" })}
    ${statCard({ label: "Active this week", value: String(weekNow), sub: trend, tone: "var(--terracotta)" })}
    ${statCard({ label: "Families signed up", value: String(families), sub: `${children} children on the roster` })}
    ${statCard({ label: "Events recorded", value: String(totalEvents), sub: since ? `since ${new Date(since).toLocaleDateString("en-GB")}` : "nothing yet" })}
  </div>

  <h2>Daily active users · last 14 days</h2>
  <div class="card">${barChart(dailyActives.map((r) => ({ label: r.label, value: Number(r.n) })))}</div>

  <div class="cols">
    <div>
      <h2>Getting started</h2>
      <div class="card">
        ${funnel([
          { label: "Invite code accepted", value: inviteOk },
          { label: "Details completed", value: stepCount("details") },
          { label: "Consent given", value: stepCount("consent") },
          { label: "Account created", value: Number(registrations[0]?.n ?? 0) },
        ])}
        ${inviteFail > 0 ? `<p class="empty">${inviteFail} invite code${inviteFail === 1 ? "" : "s"} rejected.</p>` : ""}
      </div>
    </div>
    <div>
      <h2>Course sign-up</h2>
      <div class="card">
        ${funnel([
          { label: "Sheet opened", value: opened },
          { label: "Place confirmed", value: completed },
        ])}
        ${abandoned > 0
          ? `<p class="empty">${abandoned} abandoned — ${abandonedRows
              .map((r) => `${r.n} at ${escapeHtml(r.step ?? "unknown")}`)
              .join(", ")}</p>`
          : ""}
      </div>
    </div>
  </div>

  <h2>Albums</h2>
  <div class="card">
    ${table(
      ["Album", "Opened", "Scrolled to end", "Viewer opened", "Saved"],
      albums.map((a) => [
        escapeHtml(a.album),
        String(a.opens),
        `${a.ends} <span class="muted">(${pct(Number(a.ends), Number(a.opens))}%)</span>`,
        String(a.viewer),
        String(a.downloads),
      ])
    )}
  </div>

  <div class="cols">
    <div>
      <h2>Screens</h2>
      <div class="card">
        ${table(["Route", "Views"], screens.map((s) => [`<code>${escapeHtml(s.route)}</code>`, String(s.n)]))}
      </div>
    </div>
    <div>
      <h2>Tabs opened</h2>
      <div class="card">
        ${table(["Tab", "Switches"], tabs.map((t) => [escapeHtml(t.tab), String(t.n)]))}
      </div>
    </div>
  </div>

  <h2>Families</h2>
  <div class="card">
    ${table(
      ["Family", "Email", "Last seen", "Events"],
      lastSeen.map((f) => [
        escapeHtml(f.name),
        `<span class="muted">${escapeHtml(f.email)}</span>`,
        escapeHtml(ago(f.last)),
        String(f.events),
      ])
    )}
  </div>

  <div class="cols">
    <div>
      <h2>App errors</h2>
      <div class="card">
        ${table(
          ["Screen", "Type", "Count"],
          clientErrors.map((e) => [escapeHtml(e.screen), escapeHtml(e.type), String(e.n)])
        )}
      </div>
    </div>
    <div>
      <h2>Server errors</h2>
      <div class="card">
        ${table(
          ["Route", "Status", "Count"],
          serverErrors.map((e) => [`<code>${escapeHtml(e.route)}</code>`, escapeHtml(e.status), String(e.n)])
        )}
      </div>
    </div>
  </div>

  <h2>Raw events</h2>
  <div class="card feed">
    ${table(
      ["When", "Event", "Who", "Details"],
      feed.map((row) => [
        `<span class="muted">${escapeHtml(new Date(row.created).toLocaleTimeString("en-GB"))}</span>`,
        escapeHtml(row.name),
        escapeHtml(row.who ?? "—"),
        `<code>${escapeHtml(row.props ? JSON.stringify(row.props) : "")}</code>`,
      ])
    )}
  </div>
`;

    res.type("html").send(
      layout({
        active: "usage",
        title: "Usage",
        heading: "Usage",
        sub: `Updated ${new Date().toLocaleString("en-GB")} · refreshes every minute`,
        who: res.locals.adminName,
        flash: flashFrom(req.query as Record<string, unknown>),
        refreshSeconds: 60,
        body,
      }),
    );
  } catch (error) {
    // Kept visible rather than swallowed: a dashboard that silently shows
    // nothing is worse than one that says what broke.
    console.error("[dashboard] usage failed:", error);
    res
      .status(500)
      .type("html")
      .send(`<p style="font-family:sans-serif">Dashboard failed to load: ${escapeHtml(
        error instanceof Error ? error.message : "unknown error"
      )}</p>`);
  }
}
