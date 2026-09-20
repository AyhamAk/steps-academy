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
export function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return `<p class="empty">Nothing yet.</p>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
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
  return `${title ? `<h2>${escapeHtml(title)}</h2>` : ""}<div class="card">${body}</div>`;
}

/** A yellow strip for something the admin should read before clicking on. */
export function banner(text: string, tone: "warn" | "danger" | "good" = "warn"): string {
  return `<div class="banner banner-${tone}">${escapeHtml(text)}</div>`;
}

// -------------------------------------------------------------------- layout

export type NavKey = "usage" | "users" | "students" | "courses" | "content" | "sql";

const NAV: { key: NavKey; href: string; label: string }[] = [
  { key: "usage", href: "/dashboard", label: "Usage" },
  { key: "users", href: "/dashboard/users", label: "Users" },
  { key: "students", href: "/dashboard/students", label: "Students" },
  { key: "courses", href: "/dashboard/courses", label: "Courses" },
  { key: "content", href: "/dashboard/content", label: "Content" },
  { key: "sql", href: "/dashboard/sql", label: "SQL" },
];

const STYLES = `
  :root {
    --cream:#FFFDF8; --linen:#F5EFE4; --bark:#2C2416; --muted:#8C7B65;
    --border:#E5DCC8; --terracotta:#E07A3A; --forest:#5B8A5E; --honey:#D4A843;
    --sky:#7B9EC4; --clay:#C4756A;
  }
  * { box-sizing:border-box; }
  body {
    margin:0; padding:0 0 72px; background:var(--cream); color:var(--bark);
    font-family:Nunito,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  }
  .wrap { max-width:1120px; margin:0 auto; padding:0 20px; }
  .topbar { position:sticky; top:0; z-index:5; background:var(--cream);
    border-bottom:1px solid var(--border); padding:14px 0 0; }
  .topbar-inner { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  .brand { font-size:20px; font-weight:800; color:var(--terracotta); margin:0; }
  .whoami { color:var(--muted); font-size:13px; }
  nav { display:flex; gap:4px; margin-top:12px; overflow-x:auto; }
  nav a { padding:9px 14px; border-radius:10px 10px 0 0; text-decoration:none; color:var(--muted);
    font-size:14px; font-weight:700; white-space:nowrap; border:1px solid transparent; border-bottom:0; }
  nav a:hover { color:var(--bark); background:var(--linen); }
  nav a.on { color:var(--bark); background:var(--linen); border-color:var(--border); }
  h1 { font-size:24px; font-weight:800; margin:28px 0 0; }
  .sub { color:var(--muted); font-size:14px; margin:6px 0 0; }
  h2 { font-size:17px; font-weight:700; margin:32px 0 12px; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-top:20px; }
  .stat, .card { background:var(--linen); border:1px solid var(--border); border-radius:16px; padding:16px; }
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
  th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted);
    padding:8px 10px; border-bottom:1px solid var(--border); font-weight:600; }
  td { padding:9px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }
  tr:last-child td { border-bottom:0; }
  .feed { max-height:420px; overflow-y:auto; }
  .feed td { font-size:13px; }
  code { background:var(--cream); border:1px solid var(--border); border-radius:5px; padding:1px 6px; font-size:12px; }
  .empty { color:var(--muted); font-size:14px; margin:4px 0; }
  .banner { border-radius:14px; padding:14px 16px; margin-top:20px; font-size:14px; }
  .banner-warn { background:#F7EBD0; border:1px solid var(--honey); }
  .banner-danger { background:#F8E7E4; border:1px solid var(--clay); }
  .banner-good { background:#E8F0E8; border:1px solid var(--forest); }
  .cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
  a { color:var(--terracotta); }

  .stack { display:flex; flex-direction:column; gap:14px; }
  .inline-form { display:inline; }
  .field { display:flex; flex-direction:column; gap:5px; }
  .field-label { font-size:13px; font-weight:700; }
  .req { color:var(--clay); }
  .field-hint { font-size:12px; color:var(--muted); }
  input[type=text], input[type=password], input[type=number], input[type=date],
  input[type=time], input[type=email], textarea, select {
    font:inherit; font-size:14px; padding:9px 11px; border:1px solid var(--border);
    border-radius:10px; background:var(--cream); color:var(--bark); width:100%;
  }
  textarea { resize:vertical; }
  input:focus, textarea:focus, select:focus { outline:2px solid var(--honey); outline-offset:1px; }
  .check { display:flex; align-items:center; gap:8px; font-size:14px; }
  .check input { width:auto; }
  .btn { display:inline-block; font:inherit; font-size:14px; font-weight:700; padding:9px 16px;
    border-radius:10px; border:1px solid transparent; cursor:pointer; text-decoration:none; }
  .btn-primary { background:var(--terracotta); color:#fff; }
  .btn-quiet { background:var(--cream); color:var(--bark); border-color:var(--border); }
  .btn-danger { background:var(--clay); color:#fff; }
  .btn:hover { filter:brightness(1.06); }
  .row-actions { display:flex; gap:6px; flex-wrap:wrap; }
  .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
  .pill { font-size:12px; font-weight:700; padding:2px 9px; border-radius:999px;
    border:1px solid var(--border); background:var(--cream); }
  .pill-admin { background:#F7EBD0; border-color:var(--honey); }
  .pill-pending { background:#F7EBD0; border-color:var(--honey); }
  .pill-approved { background:#E8F0E8; border-color:var(--forest); }
  .pill-rejected, .pill-cancelled { background:#F8E7E4; border-color:var(--clay); }
  .searchbar { display:flex; gap:8px; margin-top:18px; }
  .searchbar input { max-width:340px; }
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
