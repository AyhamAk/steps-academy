import { Request, Response } from "express";

import { csrfToken } from "../middleware/dashboardAuth";
import { DuplicateNationalIdError, StudentModel } from "../models/student";
import { UserModel } from "../models/user";
import { parseFamilyInput } from "../utils/studentInput";
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
  drawer,
  section,
  statCard,
  table,
  tableCard,
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

  ${section(
    "Roster",
    tableCard(["Child", "Born", "Guardians", "Photos", ""], rows, { hideOnPhone: [1, 3] }),
    search ? `matching “${search}”` : `${total} total`,
  )}

  ${section(
    "Add children",
    `<div class="cols">
    <div>
      ${drawer(
        "Add one child",
        `${formStart(`${LIST}/new`, csrf)}
          ${textField("name", "Name", "", { required: true })}
          ${textField("birthDate", "Date of birth", "", { type: "date", hint: "Drives the age band on Home." })}
          ${familyFields({})}
          ${textArea("notes", "Notes", "", { rows: 2, hint: "Private to admins." })}
          ${button("Add to roster")}
        </form>`,
      )}
    </div>
    <div>
      ${drawer(
        "Add several at once",
        `${formStart(`${LIST}/bulk`, csrf)}
          ${textArea("names", "One name per line", "", {
            rows: 6,
            hint: "Names already on the roster are skipped, whatever the capitalisation.",
          })}
          ${button("Add them all")}
        </form>`,
      )}
    </div>
  </div>`,
  )}`;

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

  const [guardians, parents] = await Promise.all([
    StudentModel.listGuardians(student.id),
    UserModel.listAllWithChildren({ limit: 500 }),
  ]);

  const linkedIds = new Set(guardians.map((g) => g.id));
  const linkable = parents.users.filter((user) => !linkedIds.has(user.id));

  const guardianRows = guardians.map((guardian) => [
    `<a href="/dashboard/users/${escapeHtml(guardian.id)}">${escapeHtml(guardian.name)}</a>`,
    `<span class="muted">${escapeHtml(guardian.email ?? guardian.phone)}</span>`,
    `${formStart(`${base}/unlink`, csrf, { inline: true })}
      <input type="hidden" name="parentId" value="${escapeHtml(guardian.id)}">
      ${button("Unlink", "quiet")}
     </form>`,
  ]);

  const body = `
  <div class="cols">
    <div>
      ${section("Details", `<div class="card"><div class="card-pad">
        ${formStart(`${base}/edit`, csrf)}
          ${textField("name", "Name", student.name, { required: true })}
          ${textField("birthDate", "Date of birth", student.birthDate ?? "", { type: "date" })}
          ${familyFields(student)}
          ${textArea("notes", "Notes", student.notes ?? "", { rows: 3 })}
          ${button("Save changes")}
        </form>
      </div></div>`)}

      ${section("Danger zone", `<div class="card"><div class="card-pad">
        <p class="sub">Removing a child takes their photo tags, album attendance,
           and course places with them. The photographs themselves stay.</p>
        ${linkButton(`${base}/delete`, "Remove from roster", "danger")}
      </div></div>`)}
    </div>

    <div>
      ${section("Guardians", `<div class="card"><div class="card-pad">
        ${banner("Only the accounts listed here can see this child's photos.", "warn")}
        ${table(["Parent", "Email", ""], guardianRows)}
        ${
          linkable.length
            ? `${formStart(`${base}/link`, csrf)}
                ${selectField(
                  "parentId",
                  "Link a guardian",
                  linkable.map((u) => ({ value: u.id, label: `${u.name} (${u.email ?? u.phone})` })),
                )}
                ${button("Link guardian")}
               </form>`
            : `<p class="field-hint">Every account is already linked.</p>`
        }
      </div></div>`)}
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
  const guardians = await StudentModel.listGuardians(student.id);

  const body = `
  ${banner("This cannot be undone.", "danger")}
  <div class="card">
    <p>Removing <strong>${escapeHtml(student.name)}</strong> also removes:</p>
    <ul>
      <li>their link to ${guardians.length} guardian${guardians.length === 1 ? "" : "s"} — those accounts lose access to these photos</li>
      <li>every photo tag naming them, so they stop appearing in their parents' gallery</li>
      <li>their place in any course, and their attendance on any album</li>
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

/** "+972501234567" → "050-123-4567" for the form box. */
function localPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "").replace(/^972/, "0");
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : phone;
}

/** The roster sheet's columns. Signing in with either phone links that parent. */
function familyFields(student: {
  nationalId?: string | null;
  groupName?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  fatherPhone?: string | null;
}): string {
  return `
    ${textField("nationalId", "ID number", student.nationalId ?? "", { placeholder: "9 digits" })}
    ${textField("groupName", "Group", student.groupName ?? "", { placeholder: "קבוצה 1" })}
    ${textField("motherName", "Mother's name", student.motherName ?? "")}
    ${textField("motherPhone", "Mother's phone", localPhone(student.motherPhone), {
      placeholder: "05x-xxx-xxxx",
      hint: "Signing in with this number links her to the child.",
    })}
    ${textField("fatherPhone", "Father's phone", localPhone(student.fatherPhone), {
      placeholder: "05x-xxx-xxxx",
      hint: "Signing in with this number links him to the child.",
    })}`;
}

/** Trims, and turns an empty box into null rather than an empty string. */
function orNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createStudent(req: Request, res: Response) {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.redirect(redirectWith(LIST, { err: "A child needs a name." }));

  const family = parseFamilyInput(req.body);
  if ("error" in family) return res.redirect(redirectWith(LIST, { err: family.error }));

  let student;
  try {
    student = await StudentModel.create({
      name,
      birthDate: orNull(req.body.birthDate),
      notes: orNull(req.body.notes),
      ...family,
    });
  } catch (error) {
    if (error instanceof DuplicateNationalIdError) {
      return res.redirect(redirectWith(LIST, { err: "Another child already has this ID number." }));
    }
    throw error;
  }
  await StudentModel.linkAccountsWithPhones(student.id, student.guardianPhones);

  res.redirect(
    redirectWith(`${LIST}/${student.id}`, {
      ok: student.guardianPhones.length
        ? `${name} added. Parents signing in with those numbers are linked automatically.`
        : `${name} added. Add a guardian phone, or link a guardian, to give them access.`,
    }),
  );
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

  const family = parseFamilyInput(req.body);
  if ("error" in family) return res.redirect(redirectWith(`${LIST}/${studentId}`, { err: family.error }));

  let student;
  try {
    student = await StudentModel.update(studentId, {
      name,
      birthDate: orNull(req.body.birthDate),
      notes: orNull(req.body.notes),
      ...family,
    });
  } catch (error) {
    if (error instanceof DuplicateNationalIdError) {
      return res.redirect(redirectWith(`${LIST}/${studentId}`, { err: "Another child already has this ID number." }));
    }
    throw error;
  }
  if (student) await StudentModel.linkAccountsWithPhones(studentId, student.guardianPhones);

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
