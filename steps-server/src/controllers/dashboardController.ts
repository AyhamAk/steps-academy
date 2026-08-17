import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

/**
 * The private usage dashboard.
 *
 * Server-rendered on purpose: it reads far better on a laptop than in a phone
 * screen, and it can change without rebuilding the app — which matters when
 * shipping a new binary takes fifteen minutes and a reinstall.
 *
 * Every number below comes from the AnalyticsEvent table. Nothing here can
 * show a photograph, a child, or anything a parent typed, because none of that
 * is ever recorded.
 */

const q = <T>(sql: string, ...params: unknown[]) =>
  prisma.$queryRawUnsafe<T[]>(sql, ...params);

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** "3 minutes ago", so a stale figure is obvious at a glance. */
function ago(date: Date | string | null): string {
  if (!date) return "never";
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

type Stat = { label: string; value: string; sub?: string; tone?: string };

function statCard({ label, value, sub, tone }: Stat): string {
  return `<div class="stat">
    <div class="stat-value"${tone ? ` style="color:${tone}"` : ""}>${escapeHtml(value)}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
    ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ""}
  </div>`;
}

/** Hand-drawn bars: a chart library would be a dependency for one graph. */
function barChart(rows: { label: string; value: number }[]): string {
  if (rows.length === 0) return `<p class="empty">Nothing yet.</p>`;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const width = 760;
  const barWidth = Math.floor(width / rows.length);
  const height = 120;

  const bars = rows
    .map((row, index) => {
      const h = Math.round((row.value / max) * (height - 24));
      const x = index * barWidth;
      const y = height - h;
      return `<g>
        <rect x="${x + 3}" y="${y}" width="${barWidth - 6}" height="${Math.max(h, 2)}"
              rx="4" fill="${row.value > 0 ? "#E07A3A" : "#E5DCC8"}"></rect>
        <text x="${x + barWidth / 2}" y="${height + 14}" text-anchor="middle"
              font-size="10" fill="#8C7B65">${escapeHtml(row.label)}</text>
        ${row.value > 0
          ? `<text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#2C2416">${row.value}</text>`
          : ""}
      </g>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height + 20}" class="chart" role="img">${bars}</svg>`;
}

function funnel(steps: { label: string; value: number }[]): string {
  if (steps.length === 0 || steps[0].value === 0) return `<p class="empty">Nobody has started yet.</p>`;
  const first = steps[0].value;
  return `<div class="funnel">${steps
    .map((step, index) => {
      const share = pct(step.value, first);
      const previous = index > 0 ? steps[index - 1].value : step.value;
      const dropped = previous - step.value;
      return `<div class="funnel-row">
        <div class="funnel-head">
          <span>${escapeHtml(step.label)}</span>
          <span class="funnel-count">${step.value}<span class="muted"> · ${share}%</span></span>
        </div>
        <div class="funnel-track"><div class="funnel-fill" style="width:${share}%"></div></div>
        ${index > 0 && dropped > 0
          ? `<div class="funnel-drop">${dropped} dropped off here</div>`
          : ""}
      </div>`;
    })
    .join("")}</div>`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return `<p class="empty">Nothing yet.</p>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table></div>`;
}

export async function dashboard(_req: Request, res: Response) {
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
      q<{ day: string; n: number }>(
        `select to_char(d.day, 'DD/MM') day,
                coalesce(count(distinct coalesce(e."userId", e."anonId")), 0)::int n
         from generate_series(date_trunc('day', now()) - interval '13 days',
                              date_trunc('day', now()), interval '1 day') d(day)
         left join "AnalyticsEvent" e on date_trunc('day', e."createdAt") = d.day
         group by d.day order by d.day`
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

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60">
<title>Steps Academy · Usage</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --cream:#FFFDF8; --linen:#F5EFE4; --bark:#2C2416; --muted:#8C7B65;
    --border:#E5DCC8; --terracotta:#E07A3A; --forest:#5B8A5E; --honey:#D4A843;
    --sky:#7B9EC4; --clay:#C4756A;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; padding:32px 24px 72px; background:var(--cream); color:var(--bark);
    font-family:Nunito,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  }
  .wrap { max-width:1120px; margin:0 auto; }
  header { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  h1 { font-size:26px; font-weight:800; color:var(--terracotta); margin:0; }
  .as-of { color:var(--muted); font-size:13px; }
  h2 { font-size:17px; font-weight:700; margin:36px 0 12px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-top:20px; }
  .stat, .card {
    background:var(--linen); border:1px solid var(--border); border-radius:16px; padding:16px;
  }
  .stat-value { font-size:30px; font-weight:800; line-height:1.1; }
  .stat-label { font-size:13px; color:var(--muted); margin-top:4px; }
  .stat-sub { font-size:12px; color:var(--muted); margin-top:6px; }
  .chart { width:100%; height:auto; }
  .funnel-row { margin-bottom:14px; }
  .funnel-head { display:flex; justify-content:space-between; font-size:14px; font-weight:600; margin-bottom:6px; }
  .funnel-count { font-weight:700; }
  .muted { color:var(--muted); font-weight:400; }
  .funnel-track { height:10px; background:var(--cream); border:1px solid var(--border); border-radius:999px; overflow:hidden; }
  .funnel-fill { height:100%; background:var(--terracotta); }
  .funnel-drop { font-size:12px; color:var(--clay); margin-top:4px; }
  .table-wrap { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); padding:8px 10px; border-bottom:1px solid var(--border); font-weight:600; }
  td { padding:9px 10px; border-bottom:1px solid var(--border); }
  tr:last-child td { border-bottom:0; }
  .feed { max-height:420px; overflow-y:auto; }
  .feed td { font-size:13px; }
  code { background:var(--cream); border:1px solid var(--border); border-radius:5px; padding:1px 6px; font-size:12px; }
  .empty { color:var(--muted); font-size:14px; margin:4px 0; }
  .banner { background:#F7EBD0; border:1px solid var(--honey); border-radius:14px; padding:14px 16px; margin-top:20px; font-size:14px; }
  .cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Steps Academy · Usage</h1>
    <div class="as-of">Updated ${escapeHtml(new Date().toLocaleString("en-GB"))} · refreshes every minute</div>
  </header>

  ${isEmpty
    ? `<div class="banner">No usage recorded yet. Numbers appear here as soon as the app is opened by anyone.</div>`
    : ""}

  <div class="stats">
    ${statCard({ label: "Active right now", value: String(liveNow[0]?.n ?? 0), sub: "last 5 minutes", tone: "var(--forest)" })}
    ${statCard({ label: "Active today", value: String(activeToday[0]?.n ?? 0), sub: "since midnight" })}
    ${statCard({ label: "Active this week", value: String(weekNow), sub: trend, tone: "var(--terracotta)" })}
    ${statCard({ label: "Families signed up", value: String(families), sub: `${children} children on the roster` })}
    ${statCard({ label: "Events recorded", value: String(totalEvents), sub: since ? `since ${new Date(since).toLocaleDateString("en-GB")}` : "nothing yet" })}
  </div>

  <h2>Daily active users · last 14 days</h2>
  <div class="card">${barChart(dailyActives.map((r) => ({ label: r.day, value: Number(r.n) })))}</div>

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
</div>
</body>
</html>`;

    res.type("html").send(html);
  } catch (error) {
    res
      .status(500)
      .type("html")
      .send(`<p style="font-family:sans-serif">Dashboard failed to load: ${escapeHtml(
        error instanceof Error ? error.message : "unknown error"
      )}</p>`);
  }
}
