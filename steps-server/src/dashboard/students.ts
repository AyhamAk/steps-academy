import { Request, Response } from "express";

import { csrfToken } from "../middleware/dashboardAuth";
import { formatCode, InviteModel, inviteStatus } from "../models/invite";
import { StudentModel } from "../models/student";
import { UserModel } from "../models/user";
import {
  banner,
  button,
  escapeHtml,
  flashFrom,
  formStart,
  layout,
  linkButton,
  redirectWith,
  selectField,
  shortDate,
  statCard,
  table,
  textArea,
  textField,
} from "../utils/html";

/**
 * The roster.
 *
 * A Student record is what photo access hangs off — a parent sees a photo
 * only because a child they are linked to is tagged in it — so everything on
 * this page is deliberately admin-only and deliberately explicit about that.
 */

const LIST = "/dashboard/students";

export async function studentsPage(req: Request, res: Response) {
  const search = typeof req.query.q === "string" ? req.query.q : "";
  const csrf = csrfToken(req.userId!);

  const [{ students, total }, counts] = await Promise.all([
    StudentModel.listWithGuardians({ search, limit: 300 }),
    StudentModel.adminCounts(),
  ]);

  const rows = students.map((student) => [
    `<a href="${LIST}/${escapeHtml(student.id)}">${escapeHtml(student.name)}</a>`,
    escapeHtml(student.birthDate ?? "—"),
    student.guardians.length
      ? student.guardians.map((g) => escapeHtml(g.name)).join(", ")
      : `<span class="muted">nobody linked</span>`,
    String(student.photoCount),
    `<div class="row-actions">${linkButton(`${LIST}/${student.id}`, "Open")}</div>`,
  ]);

  const body = `
  <div class="stats">
    ${statCard({ label: "Children", value: String(counts.students) })}
    ${statCard({
      label: "Nobody linked",
      value: String(counts.unlinkedStudents),
      sub: counts.unlinkedStudents ? "no parent sees their photos" : "every child has a guardian",
      tone: counts.unlinkedStudents ? "var(--clay)" : undefined,
    })}
    ${statCard({ label: "Photos", value: String(counts.photos), sub: `across ${counts.events} albums` })}
  </div>

  <form method="get" action="${LIST}" class="searchbar">
    <input type="text" name="q" value="${escapeHtml(search)}" placeholder="Search by name">
    ${button("Search", "quiet")}
    ${search ? linkButton(LIST, "Clear") : ""}
  </form>

  <h2>Roster</h2>
  <div class="card">
    ${table(["Child", "Born", "Guardians", "Photos", ""], rows)}
  </div>

  <div class="cols">
    <div>
      <h2>Add a child</h2>
      <div class="card">
        ${formStart(`${LIST}/new`, csrf)}
          ${textField("name", "Name", "", { required: true })}
          ${textField("birthDate", "Date of birth", "", { type: "date", hint: "Drives the age band on Home." })}
          ${textField("guardianPhone", "Guardian phone", "", { placeholder: "05x-xxx-xxxx" })}
          ${textArea("notes", "Notes", "", { rows: 2, hint: "Private to admins." })}
          ${button("Add to roster")}
        </form>
      </div>
    </div>
    <div>
      <h2>Add several at once</h2>
      <div class="card">
        ${formStart(`${LIST}/bulk`, csrf)}
          ${textArea("names", "One name per line", "", {
            rows: 6,
            hint: "Names already on the roster are skipped, whatever the capitalisation.",
          })}
          ${button("Add them all")}
        </form>
      </div>
    </div>
  </div>`;

  res.type("html").send(
    layout({
      active: "students",
      title: "Students",
      heading: "Students",
      sub: `${total} child${total === 1 ? "" : "ren"} on the roster`,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function studentDetailPage(req: Request, res: Response) {
  const student = await StudentModel.findById(String(req.params.studentId));
  if (!student) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const base = `${LIST}/${student.id}`;

  const [guardians, codes, parents] = await Promise.all([
    StudentModel.listGuardians(student.id),
    InviteModel.listForStudent(student.id),
    UserModel.listAllWithChildren({ limit: 500 }),
  ]);

  const linkedIds = new Set(guardians.map((g) => g.id));
  const linkable = parents.users.filter((user) => !linkedIds.has(user.id));

  const guardianRows = guardians.map((guardian) => [
    `<a href="/dashboard/users/${escapeHtml(guardian.id)}">${escapeHtml(guardian.name)}</a>`,
    `<span class="muted">${escapeHtml(guardian.email)}</span>`,
    `${formStart(`${base}/unlink`, csrf, { inline: true })}
      <input type="hidden" name="parentId" value="${escapeHtml(guardian.id)}">
      ${button("Unlink", "quiet")}
     </form>`,
  ]);

  const codeRows = codes.map((code) => {
    const status = inviteStatus(code);
    return [
      `<code>${escapeHtml(formatCode(code.code))}</code>`,
      `<span class="pill pill-${status === "active" ? "approved" : "rejected"}">${escapeHtml(status)}</span>`,
      `${code.useCount}/${code.maxUses}`,
      escapeHtml(code.expiresAt ? shortDate(code.expiresAt) : "never"),
      status === "active"
        ? `${formStart(`${base}/codes/${code.id}/revoke`, csrf, { inline: true })}${button("Revoke", "quiet")}</form>`
        : "",
    ];
  });

  const body = `
  <div class="cols">
    <div>
      <h2>Details</h2>
      <div class="card">
        ${formStart(`${base}/edit`, csrf)}
          ${textField("name", "Name", student.name, { required: true })}
          ${textField("birthDate", "Date of birth", student.birthDate ?? "", { type: "date" })}
          ${textField("guardianPhone", "Guardian phone", student.guardianPhone ?? "")}
          ${textArea("notes", "Notes", student.notes ?? "", { rows: 3 })}
          ${button("Save changes")}
        </form>
      </div>

      <h2>Danger zone</h2>
      <div class="card">
        <p class="sub">Removing a child takes their photo tags, album attendance,
           course places and invite codes with them. The photographs themselves stay.</p>
        ${linkButton(`${base}/delete`, "Remove from roster", "danger")}
      </div>
    </div>

    <div>
      <h2>Guardians</h2>
      <div class="card">
        ${banner("Only the accounts listed here can see this child's photos.", "warn")}
        ${table(["Parent", "Email", ""], guardianRows)}
        ${
          linkable.length
            ? `${formStart(`${base}/link`, csrf)}
                ${selectField(
                  "parentId",
                  "Link a guardian",
                  linkable.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
                )}
                ${button("Link guardian")}
               </form>`
            : `<p class="empty">Every account is already linked.</p>`
        }
      </div>

      <h2>Invite codes</h2>
      <div class="card">
        <p class="sub">A code lets one parent sign up and links them to this child automatically.</p>
        ${table(["Code", "Status", "Used", "Expires", ""], codeRows)}
        ${formStart(`${base}/codes`, csrf)}
          <div class="grid2">
            ${textField("maxUses", "Maximum uses", "2", { type: "number" })}
            ${textField("expiresInDays", "Expires in (days)", "30", { type: "number", hint: "Blank never expires." })}
          </div>
          ${button("Issue a new code")}
        </form>
      </div>
    </div>
  </div>`;

  res.type("html").send(
    layout({
      active: "students",
      title: student.name,
      heading: student.name,
      sub: guardians.length ? `${guardians.length} guardian${guardians.length === 1 ? "" : "s"}` : "No guardian linked",
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function studentDeletePage(req: Request, res: Response) {
  const student = await StudentModel.findById(String(req.params.studentId));
  if (!student) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const [guardians, codes] = await Promise.all([
    StudentModel.listGuardians(student.id),
    InviteModel.listForStudent(student.id),
  ]);

  const body = `
  ${banner("This cannot be undone.", "danger")}
  <div class="card">
    <p>Removing <strong>${escapeHtml(student.name)}</strong> also removes:</p>
    <ul>
      <li>their link to ${guardians.length} guardian${guardians.length === 1 ? "" : "s"} — those accounts lose access to these photos</li>
      <li>every photo tag naming them, so they stop appearing in their parents' gallery</li>
      <li>their place in any course, and their attendance on any album</li>
      <li>${codes.length} invite code${codes.length === 1 ? "" : "s"} issued for them</li>
    </ul>
    <p class="sub">The photographs stay in the albums. Only the tags linking them to this child go.</p>
    ${formStart(`${LIST}/${student.id}/delete`, csrf)}
      <label class="field">
        <span class="field-label">Type <strong>${escapeHtml(student.name)}</strong> to confirm</span>
        <input type="text" name="confirm" autocomplete="off" required>
      </label>
      ${button("Remove from roster", "danger")}
    </form>
    <p class="sub">${linkButton(`${LIST}/${student.id}`, "Cancel")}</p>
  </div>`;

  res.type("html").send(
    layout({
      active: "students",
      title: "Remove child",
      heading: `Remove ${student.name}?`,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

// ------------------------------------------------------------------- actions

/** Trims, and turns an empty box into null rather than an empty string. */
function orNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createStudent(req: Request, res: Response) {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.redirect(redirectWith(LIST, { err: "A child needs a name." }));

  const student = await StudentModel.create({
    name,
    birthDate: orNull(req.body.birthDate),
    guardianPhone: orNull(req.body.guardianPhone),
    notes: orNull(req.body.notes),
  });

  res.redirect(redirectWith(`${LIST}/${student.id}`, { ok: `${name} added. Link a guardian to give them access.` }));
}

export async function bulkCreateStudents(req: Request, res: Response) {
  const names = String(req.body.names ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (names.length === 0) return res.redirect(redirectWith(LIST, { err: "No names given." }));

  // Case-insensitive, matching the app's bulk import: re-pasting a class list
  // must not create a second Layla.
  const existing = await StudentModel.existingNames();
  const fresh = names.filter((name) => !existing.has(name.toLowerCase()));

  for (const name of fresh) await StudentModel.create({ name });

  const skipped = names.length - fresh.length;
  res.redirect(
    redirectWith(LIST, {
      ok: `${fresh.length} added${skipped ? `, ${skipped} already on the roster` : ""}.`,
    }),
  );
}

export async function updateStudent(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.redirect(redirectWith(`${LIST}/${studentId}`, { err: "A child needs a name." }));

  await StudentModel.update(studentId, {
    name,
    birthDate: orNull(req.body.birthDate),
    guardianPhone: orNull(req.body.guardianPhone),
    notes: orNull(req.body.notes),
  });

  res.redirect(redirectWith(`${LIST}/${studentId}`, { ok: "Saved." }));
}

export async function linkGuardian(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  const parentId = String(req.body.parentId ?? "");

  const [student, parent] = await Promise.all([StudentModel.findById(studentId), UserModel.findById(parentId)]);
  if (!student || !parent) {
    return res.redirect(redirectWith(`${LIST}/${studentId}`, { err: "Child or account not found." }));
  }

  await StudentModel.linkParent(parentId, studentId);
  res.redirect(redirectWith(`${LIST}/${studentId}`, { ok: `${parent.name} can now see ${student.name}'s photos.` }));
}

export async function unlinkGuardian(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  const parentId = String(req.body.parentId ?? "");

  const parent = await UserModel.findById(parentId);
  await StudentModel.unlinkParent(parentId, studentId);
  res.redirect(
    redirectWith(`${LIST}/${studentId}`, { ok: `${parent?.name ?? "That account"} no longer sees these photos.` }),
  );
}

export async function issueInvite(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  const maxUses = Number(req.body.maxUses) || 2;
  const days = String(req.body.expiresInDays ?? "").trim();

  const invite = await InviteModel.create({
    studentId,
    createdBy: req.userId!,
    maxUses,
    expiresInDays: days ? Number(days) : null,
  });

  res.redirect(redirectWith(`${LIST}/${studentId}`, { ok: `New code: ${formatCode(invite.code)}` }));
}

export async function revokeInvite(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  await InviteModel.revoke(String(req.params.codeId));
  res.redirect(redirectWith(`${LIST}/${studentId}`, { ok: "Code revoked." }));
}

export async function deleteStudent(req: Request, res: Response) {
  const studentId = String(req.params.studentId);
  const student = await StudentModel.findById(studentId);
  if (!student) return res.redirect(redirectWith(LIST, { err: "That child is already gone." }));

  if (String(req.body.confirm ?? "").trim() !== student.name) {
    return res.redirect(redirectWith(`${LIST}/${studentId}/delete`, { err: "The name did not match. Nothing was removed." }));
  }

  await StudentModel.remove(studentId);
  res.redirect(redirectWith(LIST, { ok: `${student.name} removed from the roster.` }));
}

function notFound(): string {
  return layout({
    active: "students",
    title: "Not found",
    heading: "No such child",
    sub: "They may already have been removed.",
    body: `<p class="sub">${linkButton(LIST, "Back to students")}</p>`,
  });
}
