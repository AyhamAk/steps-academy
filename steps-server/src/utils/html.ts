/**
 * The building blocks every admin page is made of.
 *
 * These started life inside the usage dashboard and moved here once there was
 * more than one page to draw. Everything is a string-returning function: the
 * panel is server-rendered with no client JavaScript, partly because helmet's
 * default CSP would block an inline script, and mostly because a page that is
 * only ever a form and a table does not need one.
 */

/**
 * Escapes the five characters that can break out of HTML text or an attribute.
 *
 * The apostrophe matters here in a way it did not on the read-only dashboard:
 * these pages put names typed by an admin into `value="..."` attributes.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** "3 minutes ago", so a stale figure is obvious at a glance. */
export function ago(date: Date | string | null): string {
  if (!date) return "never";
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** 14/03/2026 — unambiguous for an Israeli academy, unlike the US order. */
export function shortDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB");
}

export type Stat = { label: string; value: string; sub?: string; tone?: string };

export function statCard({ label, value, sub, tone }: Stat): string {
  return `<div class="stat">
    <div class="stat-value"${tone ? ` style="color:${tone}"` : ""}>${escapeHtml(value)}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
    ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ""}
  </div>`;
}

/** Hand-drawn bars: a chart library would be a dependency for one graph. */
export function barChart(rows: { label: string; value: number }[]): string {
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

export function funnel(steps: { label: string; value: number }[]): string {
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

/**
 * Cells are inserted raw so a caller can wrap one in `<code>` or a link.
 * That makes escaping the caller's job — every call site must run untrusted
 * text through `escapeHtml` itself.
 */
export function table(headers: string[], rows: string[][], opts: { hideOnPhone?: number[] } = {}): string {
  if (rows.length === 0) return `<p class="empty">Nothing yet.</p>`;
  // A wide table on a phone turns into a horizontal scrollbar nobody finds.
  // Columns listed in `hideOnPhone` drop out below 760px, leaving the ones
  // that actually identify a row.
  const optional = new Set(opts.hideOnPhone ?? []);
  const cls = (index: number) => (optional.has(index) ? ' class="opt"' : "");
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((h, i) => `<th${cls(i)}>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((cell, i) => `<td${cls(i)}>${cell}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table></div>`;
}

// ---------------------------------------------------------------- form parts

export function textField(
  name: string,
  label: string,
  value: unknown = "",
  opts: { type?: string; placeholder?: string; required?: boolean; hint?: string } = {},
): string {
  const { type = "text", placeholder = "", required = false, hint } = opts;
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}${required ? ` <span class="req">*</span>` : ""}</span>
    <input type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(value)}"
           placeholder="${escapeHtml(placeholder)}"${required ? " required" : ""}>
    ${hint ? `<span class="field-hint">${escapeHtml(hint)}</span>` : ""}
  </label>`;
}

export function textArea(
  name: string,
  label: string,
  value: unknown = "",
  opts: { rows?: number; placeholder?: string; hint?: string } = {},
): string {
  const { rows = 4, placeholder = "", hint } = opts;
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <textarea name="${escapeHtml(name)}" rows="${rows}"
              placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
    ${hint ? `<span class="field-hint">${escapeHtml(hint)}</span>` : ""}
  </label>`;
}

export function selectField(
  name: string,
  label: string,
  options: { value: string; label: string }[],
  selected?: string,
): string {
  return `<label class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <select name="${escapeHtml(name)}">
      ${options
        .map(
          (o) =>
            `<option value="${escapeHtml(o.value)}"${o.value === selected ? " selected" : ""}>${escapeHtml(o.label)}</option>`,
        )
        .join("")}
    </select>
  </label>`;
}

export function checkboxField(name: string, label: string, checked = false): string {
  return `<label class="check">
    <input type="checkbox" name="${escapeHtml(name)}" value="1"${checked ? " checked" : ""}>
    <span>${escapeHtml(label)}</span>
  </label>`;
}

/** Opens a POST form already carrying the CSRF token every write requires. */
export function formStart(action: string, csrf: string, opts: { inline?: boolean } = {}): string {
  return `<form method="post" action="${escapeHtml(action)}" class="${opts.inline ? "inline-form" : "stack"}">
    <input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">`;
}

export function button(label: string, tone: "primary" | "quiet" | "danger" = "primary"): string {
  return `<button type="submit" class="btn btn-${tone}">${escapeHtml(label)}</button>`;
}

export function linkButton(href: string, label: string, tone: "primary" | "quiet" | "danger" = "quiet"): string {
  return `<a class="btn btn-${tone}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

export function card(title: string | null, body: string): string {
  return `${title ? `<h2>${escapeHtml(title)}</h2>` : ""}<div class="card"><div class="card-pad">${body}</div></div>`;
}

/**
 * A titled block. `note` sits opposite the heading, for the one line of
 * context a section usually needs — a count, or who gets notified — instead
 * of a paragraph floating above the card.
 */
export function section(title: string, body: string, note?: string): string {
  return `<section class="block">
    <div class="block-head">
      <h2>${escapeHtml(title)}</h2>
      ${note ? `<span class="block-note">${escapeHtml(note)}</span>` : ""}
    </div>
    ${body}
  </section>`;
}

/** A table filling a card — the card is the frame, so no inner padding. */
export function tableCard(
  headers: string[],
  rows: string[][],
  opts: { hideOnPhone?: number[] } = {},
): string {
  return `<div class="card">${table(headers, rows, opts)}</div>`;
}

/** Free-form content inside a card, padded. */
export function padCard(body: string): string {
  return `<div class="card"><div class="card-pad">${body}</div></div>`;
}

/**
 * A form folded away behind a summary line.
 *
 * Every page had its create-forms stacked under the list, so the thing you
 * read daily sat below the thing you do occasionally. `details` collapses
 * them with no JavaScript — the panel ships none, and helmet's CSP would
 * block an inline script anyway.
 */
export function drawer(label: string, body: string, open = false): string {
  return `<details class="drawer"${open ? " open" : ""}>
    <summary>${escapeHtml(label)}</summary>
    <div class="drawer-body">${body}</div>
  </details>`;
}

/** A yellow strip for something the admin should read before clicking on. */
export function banner(text: string, tone: "warn" | "danger" | "good" = "warn"): string {
  return `<div class="banner banner-${tone}">${escapeHtml(text)}</div>`;
}

// -------------------------------------------------------------------- layout

export type NavKey = "usage" | "users" | "students" | "courses" | "content" | "health" | "sql";

const NAV: { key: NavKey; href: string; label: string }[] = [
  { key: "usage", href: "/dashboard", label: "Usage" },
  { key: "users", href: "/dashboard/users", label: "Users" },
  { key: "students", href: "/dashboard/students", label: "Students" },
  { key: "courses", href: "/dashboard/courses", label: "Courses" },
  { key: "content", href: "/dashboard/content", label: "Content" },
  { key: "health", href: "/dashboard/health", label: "Health" },
  { key: "sql", href: "/dashboard/sql", label: "SQL" },
];

const STYLES = `
  :root {
    --cream:#FFFDF8; --linen:#F5EFE4; --bark:#2C2416; --muted:#8C7B65;
    --border:#E5DCC8; --terracotta:#E07A3A; --forest:#5B8A5E; --honey:#D4A843;
    --sky:#7B9EC4; --clay:#C4756A;
    --panel:#FFFFFF; --shadow:0 1px 2px rgba(44,36,22,.04), 0 4px 16px rgba(44,36,22,.04);
  }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body {
    margin:0; padding:0 0 80px; background:var(--cream); color:var(--bark);
    font-family:Nunito,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    font-size:15px; line-height:1.5;
  }
  .wrap { max-width:1180px; margin:0 auto; padding:0 20px; }

  /* chrome */
  .topbar { position:sticky; top:0; z-index:20; background:rgba(255,253,248,.93);
    backdrop-filter:saturate(1.6) blur(8px); border-bottom:1px solid var(--border); }
  .topbar-inner { display:flex; align-items:center; justify-content:space-between;
    gap:12px; padding:10px 0 0; }
  .brand { font-size:16px; font-weight:800; color:var(--terracotta); margin:0; letter-spacing:-.2px; }
  .whoami { color:var(--muted); font-size:12px; }
  nav { display:flex; gap:2px; margin-top:8px; overflow-x:auto; scrollbar-width:none; }
  nav::-webkit-scrollbar { display:none; }
  nav a { padding:8px 13px 10px; text-decoration:none; color:var(--muted);
    font-size:14px; font-weight:700; white-space:nowrap; border-bottom:2px solid transparent; }
  nav a:hover { color:var(--bark); }
  nav a.on { color:var(--terracotta); border-bottom-color:var(--terracotta); }

  .page-head { display:flex; align-items:flex-end; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin:26px 0 2px; }
  h1 { font-size:25px; font-weight:800; margin:0; letter-spacing:-.4px; }
  .sub { color:var(--muted); font-size:14px; margin:4px 0 0; }

  /* sections */
  section.block { margin-top:26px; }
  .block-head { display:flex; align-items:baseline; justify-content:space-between;
    gap:10px; flex-wrap:wrap; margin-bottom:9px; }
  h2 { font-size:12px; font-weight:800; margin:0; text-transform:uppercase;
    letter-spacing:.9px; color:var(--muted); }
  .block-note { font-size:12px; color:var(--muted); }

  .card { background:var(--panel); border:1px solid var(--border);
    border-radius:14px; box-shadow:var(--shadow); overflow:hidden; }
  .card-pad { padding:16px; }
  .card + .card, .card + details.drawer, details.drawer + .card { margin-top:12px; }

  /* stats */
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
    gap:10px; margin-top:18px; }
  .stat { background:var(--panel); border:1px solid var(--border); border-radius:14px;
    padding:13px 15px; box-shadow:var(--shadow); }
  .stat-value { font-size:26px; font-weight:800; line-height:1.15; letter-spacing:-.5px; }
  .stat-label { font-size:12px; color:var(--muted); margin-top:2px; font-weight:600; }
  .stat-sub { font-size:11px; color:var(--muted); margin-top:5px; }

  /* tables */
  .table-wrap { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.7px;
    color:var(--muted); padding:10px 14px; background:var(--linen);
    border-bottom:1px solid var(--border); font-weight:700; white-space:nowrap; }
  td { padding:11px 14px; border-bottom:1px solid var(--border); vertical-align:middle; }
  tbody tr:last-child td { border-bottom:0; }
  tbody tr:hover { background:#FDFBF6; }
  td a { font-weight:700; text-decoration:none; }
  td a:hover { text-decoration:underline; }
  .feed { max-height:440px; overflow-y:auto; }
  .feed td { font-size:13px; }

  code { background:var(--linen); border:1px solid var(--border); border-radius:5px;
    padding:1px 6px; font-size:12px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  .muted { color:var(--muted); font-weight:400; }
  .empty { color:var(--muted); font-size:14px; margin:0; padding:18px; text-align:center; }
  a { color:var(--terracotta); }

  /* banners */
  .banner { border-radius:12px; padding:11px 14px; margin-top:14px; font-size:13.5px; }
  .banner-warn { background:#FBF3E2; border:1px solid #EAD6A8; }
  .banner-danger { background:#F9EAE7; border:1px solid #E6BDB5; }
  .banner-good { background:#EBF2EB; border:1px solid #BFD6C1; }

  /* forms */
  details.drawer { background:var(--panel); border:1px solid var(--border);
    border-radius:14px; box-shadow:var(--shadow); }
  details.drawer > summary { cursor:pointer; padding:12px 16px; font-weight:700;
    font-size:14px; list-style:none; display:flex; align-items:center; gap:8px; }
  details.drawer > summary::-webkit-details-marker { display:none; }
  details.drawer > summary::before { content:"+"; color:var(--terracotta);
    font-weight:800; font-size:16px; line-height:1; }
  details.drawer[open] > summary::before { content:"–"; }
  details.drawer[open] > summary { border-bottom:1px solid var(--border); }
  .drawer-body { padding:16px; }

  .stack { display:flex; flex-direction:column; gap:13px; }
  .inline-form { display:inline; }
  .field { display:flex; flex-direction:column; gap:4px; }
  .field-label { font-size:12px; font-weight:700; color:var(--muted);
    text-transform:uppercase; letter-spacing:.5px; }
  .req { color:var(--clay); }
  .field-hint { font-size:12px; color:var(--muted); }
  input[type=text], input[type=password], input[type=number], input[type=date],
  input[type=time], input[type=email], textarea, select {
    font:inherit; font-size:14px; padding:9px 11px; border:1px solid var(--border);
    border-radius:9px; background:var(--cream); color:var(--bark); width:100%;
  }
  textarea { resize:vertical; font-family:inherit; }
  input:focus, textarea:focus, select:focus {
    outline:none; border-color:var(--honey); box-shadow:0 0 0 3px rgba(212,168,67,.18); }
  .check { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; }
  .check input { width:auto; }

  .btn { display:inline-block; font:inherit; font-size:13.5px; font-weight:700;
    padding:8px 15px; border-radius:9px; border:1px solid transparent; cursor:pointer;
    text-decoration:none; white-space:nowrap; }
  .btn-primary { background:var(--terracotta); color:#fff; }
  .btn-quiet { background:var(--panel); color:var(--bark); border-color:var(--border); }
  .btn-danger { background:var(--clay); color:#fff; }
  .btn:hover { filter:brightness(1.05); }
  .btn-quiet:hover { background:var(--linen); }
  .row-actions { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:13px; }
  .cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:18px;
    align-items:start; }

  .pill { display:inline-block; font-size:11px; font-weight:800; padding:2px 9px;
    border-radius:999px; border:1px solid var(--border); background:var(--linen);
    text-transform:uppercase; letter-spacing:.4px; }
  .pill-admin, .pill-pending { background:#FBF3E2; border-color:#EAD6A8; color:#8A6A1E; }
  .pill-approved { background:#EBF2EB; border-color:#BFD6C1; color:#3F6B43; }
  .pill-rejected, .pill-cancelled { background:#F9EAE7; border-color:#E6BDB5; color:#9C4C41; }
  .pill-live { background:var(--forest); border-color:var(--forest); color:#fff; }

  .searchbar { display:flex; gap:8px; margin-top:16px; align-items:center; flex-wrap:wrap; }
  .searchbar input, .searchbar select { max-width:320px; }
  .searchbar .field { flex-direction:row; align-items:center; gap:8px; }

  /* charts */
  .chart { width:100%; height:auto; }
  .funnel-row { margin-bottom:13px; }
  .funnel-row:last-child { margin-bottom:0; }
  .funnel-head { display:flex; justify-content:space-between; font-size:13.5px;
    font-weight:700; margin-bottom:5px; }
  .funnel-count { font-weight:800; }
  .funnel-track { height:8px; background:var(--linen); border-radius:999px; overflow:hidden; }
  .funnel-fill { height:100%; background:var(--terracotta); }
  .funnel-drop { font-size:11.5px; color:var(--clay); margin-top:4px; }

  @media (max-width:760px) {
    th.opt, td.opt { display:none; }
  }
  @media (max-width:640px) {
    .wrap { padding:0 14px; }
    h1 { font-size:21px; }
    .stat-value { font-size:22px; }
    td, th { padding:9px 10px; }
    .stats { grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); }
    .btn { padding:9px 14px; }
    .searchbar input, .searchbar select { max-width:none; flex:1; }
  }
`;

/**
 * The page shell. `flash` is the one-line result of whatever POST redirected
 * here — carried in the query string rather than a session, because there is
 * no session store and a stale message is harmless.
 */
export function layout(opts: {
  active: NavKey;
  title: string;
  heading: string;
  sub?: string;
  who?: string;
  flash?: { text: string; tone: "warn" | "danger" | "good" } | null;
  body: string;
  refreshSeconds?: number;
}): string {
  const { active, title, heading, sub, who, flash, body, refreshSeconds } = opts;

  const nav = NAV.map(
    (item) =>
      `<a href="${item.href}" class="${item.key === active ? "on" : ""}">${escapeHtml(item.label)}</a>`,
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${refreshSeconds ? `<meta http-equiv="refresh" content="${refreshSeconds}">` : ""}
<title>Steps Academy · ${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>
<div class="topbar">
  <div class="wrap">
    <div class="topbar-inner">
      <p class="brand">Steps Academy</p>
      <span class="whoami">${who ? escapeHtml(`signed in as ${who}`) : ""}</span>
    </div>
    <nav>${nav}</nav>
  </div>
</div>
<div class="wrap">
  <h1>${escapeHtml(heading)}</h1>
  ${sub ? `<p class="sub">${escapeHtml(sub)}</p>` : ""}
  ${flash ? `<div class="banner banner-${flash.tone}">${escapeHtml(flash.text)}</div>` : ""}
  ${body}
</div>
</body>
</html>`;
}

/** Turns `?ok=Saved` / `?err=Nope` into the banner `layout` expects. */
export function flashFrom(query: Record<string, unknown>): { text: string; tone: "warn" | "danger" | "good" } | null {
  if (typeof query.ok === "string" && query.ok) return { text: query.ok, tone: "good" };
  if (typeof query.err === "string" && query.err) return { text: query.err, tone: "danger" };
  return null;
}

/** `/dashboard/users?ok=Deleted` — the redirect target after a write. */
export function redirectWith(base: string, result: { ok?: string; err?: string }): string {
  const key = result.err ? "err" : "ok";
  const value = result.err ?? result.ok ?? "";
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}
