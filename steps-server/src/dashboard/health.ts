import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { Request, Response } from "express";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { r2 } from "../lib/r2";
import { SENTRY_ENABLED } from "../lib/sentry";
import {
  banner,
  escapeHtml,
  flashFrom,
  layout,
  padCard,
  section,
  statCard,
  tableCard,
} from "../utils/html";

/**
 * Is anything about to break?
 *
 * Deliberately measured rather than asserted: every row here is a live check
 * made when the page loads, because a status page that reports what the
 * config *says* is true is worth nothing.
 *
 * This cannot tell you the API is down — if it were, this page would be down
 * with it. That job belongs to something outside the box, which is why the
 * page says so rather than pretending otherwise.
 */

/** Supabase's free tier stops at 500 MB. */
const FREE_DB_LIMIT_MB = 500;

type Check = { name: string; ok: boolean | null; detail: string; note?: string };

function light(ok: boolean | null): string {
  if (ok === null) return `<span class="pill">unknown</span>`;
  return ok
    ? `<span class="pill pill-approved">good</span>`
    : `<span class="pill pill-rejected">attention</span>`;
}

function human(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export async function healthPage(req: Request, res: Response) {
  const checks: Check[] = [];

  // ---- database ----------------------------------------------------------
  let dbMb = 0;
  let dbLatency = -1;
  try {
    const started = Date.now();
    const [size] = await prisma.$queryRawUnsafe<{ mb: number }[]>(
      `select round(pg_database_size(current_database()) / 1048576.0, 1)::float8 mb`,
    );
    dbLatency = Date.now() - started;
    dbMb = Number(size?.mb ?? 0);
    checks.push({
      name: "Database",
      ok: dbLatency < 1500,
      detail: `${dbMb} MB used · replied in ${dbLatency} ms`,
      note: dbLatency >= 1500 ? "Slow. Supabase may be waking up." : undefined,
    });
  } catch (error) {
    checks.push({
      name: "Database",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 120) : "unreachable",
    });
  }

  // ---- connection headroom ----------------------------------------------
  // Running out of connections looks like a total outage to a parent, and it
  // is the ceiling a small Postgres hits first.
  let conns = { used: 0, max: 0 };
  try {
    const [row] = await prisma.$queryRawUnsafe<{ used: number; max: number }[]>(
      `select count(*)::int used, current_setting('max_connections')::int max from pg_stat_activity`,
    );
    conns = { used: Number(row?.used ?? 0), max: Number(row?.max ?? 0) };
    const share = conns.max ? Math.round((conns.used / conns.max) * 100) : 0;
    checks.push({
      name: "Database connections",
      ok: share < 80,
      detail: `${conns.used} of ${conns.max} in use (${share}%)`,
      note: share >= 80 ? "Close to the ceiling — new requests will start failing." : undefined,
    });
  } catch {
    checks.push({ name: "Database connections", ok: null, detail: "could not read" });
  }

  // ---- photo storage -----------------------------------------------------
  try {
    const started = Date.now();
    await r2.send(new HeadBucketCommand({ Bucket: env.r2.bucketName }));
    checks.push({
      name: "Photo storage",
      ok: true,
      detail: `bucket "${env.r2.bucketName}" reachable in ${Date.now() - started} ms`,
    });
  } catch (error) {
    checks.push({
      name: "Photo storage",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 120) : "unreachable",
      note: "Parents will see broken photos.",
    });
  }

  // ---- crash reporting ---------------------------------------------------
  checks.push({
    name: "Crash reporting",
    ok: SENTRY_ENABLED,
    detail: SENTRY_ENABLED ? "Sentry is receiving errors" : "SENTRY_DSN is not set",
    note: SENTRY_ENABLED ? undefined : "Nothing is recording server errors. You find out when a parent tells you.",
  });

  // ---- push --------------------------------------------------------------
  const pushReady = await prisma.user.count({ where: { pushToken: { not: null }, role: "parent" } });
  const parents = await prisma.user.count({ where: { role: "parent" } });
  checks.push({
    name: "Push notifications",
    ok: parents === 0 ? null : pushReady > 0,
    detail: `${pushReady} of ${parents} parents can receive a push`,
    note: parents > 0 && pushReady === 0 ? "Nobody would be told about new photos." : undefined,
  });

  // ---- recent server errors ---------------------------------------------
  let recentErrors: { route: string; status: string; n: number }[] = [];
  try {
    recentErrors = await prisma.$queryRawUnsafe<{ route: string; status: string; n: number }[]>(
      `select props->>'route' route, props->>'status' status, count(*)::int n
       from "AnalyticsEvent"
       where name = 'api_request' and (props->>'status')::int >= 500
         and "createdAt" > now() - interval '24 hours'
       group by 1,2 order by n desc limit 10`,
    );
  } catch {
    /* the panel must still render if this one query fails */
  }
  const errorCount = recentErrors.reduce((sum, row) => sum + Number(row.n), 0);
  checks.push({
    name: "Server errors today",
    ok: errorCount === 0,
    detail: errorCount === 0 ? "none in 24 hours" : `${errorCount} in the last 24 hours`,
  });

  const failing = checks.filter((check) => check.ok === false).length;
  const dbShare = Math.round((dbMb / FREE_DB_LIMIT_MB) * 100);

  const body = `
  <div class="stats">
    ${statCard({
      label: "Everything working",
      value: failing === 0 ? "Yes" : `${failing} issue${failing === 1 ? "" : "s"}`,
      tone: failing === 0 ? "var(--forest)" : "var(--clay)",
      sub: "checked just now",
    })}
    ${statCard({ label: "API uptime", value: human(process.uptime() * 1000), sub: "since the last deploy" })}
    ${statCard({
      label: "Database",
      value: `${dbMb} MB`,
      sub: `${dbShare}% of the ${FREE_DB_LIMIT_MB} MB free tier`,
      tone: dbShare > 80 ? "var(--clay)" : undefined,
    })}
    ${statCard({ label: "Memory", value: `${Math.round(process.memoryUsage().rss / 1048576)} MB` })}
  </div>

  ${
    failing === 0
      ? ""
      : banner("Something below needs attention. Parents may already be affected.", "danger")
  }

  ${section(
    "Live checks",
    tableCard(
      ["What", "State", "Detail"],
      checks.map((check) => [
        escapeHtml(check.name),
        light(check.ok),
        `${escapeHtml(check.detail)}${check.note ? `<div class="field-hint">${escapeHtml(check.note)}</div>` : ""}`,
      ]),
    ),
    "measured when this page loaded",
  )}

  ${
    recentErrors.length
      ? section(
          "Failing requests · last 24 hours",
          tableCard(
            ["Route", "Status", "Count"],
            recentErrors.map((row) => [
              `<code>${escapeHtml(row.route)}</code>`,
              escapeHtml(row.status),
              String(row.n),
            ]),
          ),
        )
      : ""
  }

  ${section(
    "Outside monitoring",
    padCard(
      `<p class="sub">This page cannot tell you the API is down — if it were, this page would be down too.
       Point an uptime checker at the address below and it will email you instead.</p>
       <p><code>${escapeHtml(`${req.protocol}://${req.get("host")}`)}/health</code></p>
       <p class="field-hint">It needs no login and returns <code>{"status":"ok"}</code>.
       UptimeRobot's free plan checks every five minutes, which is enough.</p>`,
    ),
  )}`;

  res.type("html").send(
    layout({
      active: "health",
      title: "Health",
      heading: "Health",
      sub: failing === 0 ? "Everything is answering" : "Something needs attention",
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      refreshSeconds: 120,
      body,
    }),
  );
}
