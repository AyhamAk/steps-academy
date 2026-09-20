import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { csrfToken } from "../middleware/dashboardAuth";
import { banner, button, escapeHtml, formStart, layout, table } from "../utils/html";

/**
 * A read-only window onto the database.
 *
 * For the questions no page answers — "which families never opened an album",
 * "how many codes went unused". It refuses to write, and refuses in two
 * independent ways: a shape check on the text, and a genuinely read-only
 * transaction that Postgres itself enforces. The second is the one that
 * matters; the first only exists to give a friendlier error.
 */

const MAX_ROWS = 500;
const TIMEOUT_MS = 10_000;

/** Strips comments so `-- ` or a block comment cannot hide a second statement. */
function withoutComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();
}

function rejectionReason(sql: string): string | null {
  const bare = withoutComments(sql);
  if (!bare) return "Nothing to run.";

  // A trailing semicolon is normal; anything after one is a second statement.
  const withoutTrailing = bare.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) return "One statement at a time, please.";

  if (!/^(select|with)\b/i.test(withoutTrailing)) {
    return "Only SELECT is allowed here. Use the pages above to change anything.";
  }
  return null;
}

/** JSON and BigInt both appear in these tables; neither survives String() alone. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return `<span class="muted">null</span>`;
  if (typeof value === "bigint") return escapeHtml(value.toString());
  if (value instanceof Date) return escapeHtml(value.toISOString());
  if (typeof value === "object") return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  return escapeHtml(value);
}

export async function sqlPage(req: Request, res: Response) {
  const csrf = csrfToken(req.userId!);
  const query = typeof req.body?.sql === "string" ? req.body.sql : "";

  let result = "";
  let error: string | null = null;

  if (query.trim()) {
    error = rejectionReason(query);
    if (!error) {
      try {
        const rows = await run(query);
        if (rows.length === 0) {
          result = `<p class="empty">No rows.</p>`;
        } else {
          const headers = Object.keys(rows[0] as Record<string, unknown>);
          result = `
            <p class="sub">${rows.length}${rows.length === MAX_ROWS ? "+" : ""} row${rows.length === 1 ? "" : "s"}${
              rows.length === MAX_ROWS ? ` — showing the first ${MAX_ROWS}` : ""
            }</p>
            ${table(
              headers,
              rows.map((row) => headers.map((header) => cell((row as Record<string, unknown>)[header]))),
            )}`;
        }
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "Query failed.";
      }
    }
  }

  const body = `
  ${banner("This is the live production database. Reads only — writes are refused by Postgres, not just by this page.", "warn")}

  <div class="card">
    ${formStart("/dashboard/sql", csrf)}
      <label class="field">
        <span class="field-label">Query</span>
        <textarea name="sql" rows="6" placeholder='select name, email from "User" order by "createdAt" desc limit 20'>${escapeHtml(query)}</textarea>
        <span class="field-hint">Table names are case-sensitive and need double quotes: <code>"User"</code>, not <code>user</code>.</span>
      </label>
      ${button("Run")}
    </form>
  </div>

  ${error ? `<div class="banner banner-danger">${escapeHtml(error)}</div>` : ""}
  ${result ? `<h2>Result</h2><div class="card feed">${result}</div>` : ""}`;

  res.type("html").send(
    layout({
      active: "sql",
      title: "SQL",
      heading: "SQL",
      sub: "Read-only queries against the live database",
      who: res.locals.adminName,
      body,
    }),
  );
}

/**
 * Runs the query inside a transaction Postgres will not let write.
 *
 * `SET TRANSACTION READ ONLY` is the real guard — a clever `select` that calls
 * a volatile function still cannot change a row inside one. The statement
 * timeout keeps a careless cross join from holding a pooled connection open.
 */
async function run(sql: string): Promise<unknown[]> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`);
    const rows = await tx.$queryRawUnsafe<unknown[]>(sql.replace(/;\s*$/, ""));
    return rows.slice(0, MAX_ROWS);
  });
}
