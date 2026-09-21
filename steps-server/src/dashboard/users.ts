import { Request, Response } from "express";

import { csrfToken } from "../middleware/dashboardAuth";
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
  section,
  shortDate,
  statCard,
  table,
  tableCard,
} from "../utils/html";

/**
 * Accounts.
 *
 * The app has no admin user management at all — a parent can delete their own
 * account and that is the whole of it. Everything here is new ground, which
 * is also why the delete flow is the most careful thing in the panel.
 */

const LIST = "/dashboard/users";

export async function usersPage(req: Request, res: Response) {
  const search = typeof req.query.q === "string" ? req.query.q : "";
  const { users, total } = await UserModel.listAllWithChildren({ search, limit: 200 });
  const awaiting = await UserModel.listAwaitingLink();

  const rows = users.map((user) => [
    `<a href="${LIST}/${escapeHtml(user.id)}">${escapeHtml(user.name)}</a>`,
    `<span class="muted">${escapeHtml(user.email)}</span>`,
    user.role === "admin" ? `<span class="pill pill-admin">admin</span>` : `<span class="pill">parent</span>`,
    user.children.length
      ? user.children.map((child) => escapeHtml(child.name)).join(", ")
      : user.claimedChildName
        ? `<span class="muted">claims “${escapeHtml(user.claimedChildName)}”</span>`
        : `<span class="muted">none</span>`,
    escapeHtml(shortDate(user.createdAt)),
    `<div class="row-actions">${linkButton(`${LIST}/${user.id}`, "Open")}</div>`,
  ]);

  const body = `
  <div class="stats">
    ${statCard({ label: "Accounts", value: String(total) })}
    ${statCard({ label: "Admins", value: String(users.filter((u) => u.role === "admin").length) })}
    ${statCard({
      label: "Awaiting a child link",
      value: String(awaiting.length),
      sub: awaiting.length ? "signed up but can see nothing" : "nobody waiting",
      tone: awaiting.length ? "var(--clay)" : undefined,
    })}
  </div>

  <form method="get" action="${LIST}" class="searchbar">
    <input type="text" name="q" value="${escapeHtml(search)}" placeholder="Search name or email">
    ${button("Search", "quiet")}
    ${search ? linkButton(LIST, "Clear") : ""}
  </form>

  ${section(
    "All accounts",
    tableCard(["Name", "Email", "Role", "Children", "Joined", ""], rows),
    search ? `matching “${search}”` : undefined,
  )}`;

  res.type("html").send(
    layout({
      active: "users",
      title: "Users",
      heading: "Users",
      sub: `${total} account${total === 1 ? "" : "s"}`,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function userDetailPage(req: Request, res: Response) {
  const user = await UserModel.findById(String(req.params.userId));
  if (!user) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const base = `${LIST}/${user.id}`;

  const [children, allStudents, owned, admins] = await Promise.all([
    StudentModel.listByParent(user.id),
    StudentModel.listAll(),
    UserModel.ownedContentCounts(user.id),
    UserModel.listAdmins(),
  ]);

  const linkedIds = new Set(children.map((child) => child.id));
  const linkable = allStudents.filter((student) => !linkedIds.has(student.id));
  const isLastAdmin = user.role === "admin" && admins.length <= 1;

  const childRows = children.map((child) => [
    escapeHtml(child.name),
    `${formStart(`${base}/unlink`, csrf, { inline: true })}
      <input type="hidden" name="studentId" value="${escapeHtml(child.id)}">
      ${button("Unlink", "quiet")}
     </form>`,
  ]);

  const body = `
  <div class="stats">
    ${statCard({ label: "Role", value: user.role })}
    ${statCard({ label: "Children linked", value: String(children.length) })}
    ${statCard({ label: "Joined", value: shortDate(user.createdAt) })}
    ${statCard({
      label: "Sign-in",
      value: user.passwordHash ? "Password" : "Google only",
      sub: user.passwordHash ? undefined : "cannot use the dashboard",
    })}
  </div>

  <div class="cols">
    <div>
      ${section("Children", `<div class="card"><div class="card-pad">
        ${banner(
          "Linking a child here is what grants this account access to that child's photos. Nothing else does.",
          "warn",
        )}
        ${table(["Child", ""], childRows)}
        ${
          linkable.length
            ? `${formStart(`${base}/link`, csrf)}
                ${selectField(
                  "studentId",
                  "Link another child",
                  linkable.map((s) => ({ value: s.id, label: s.name })),
                )}
                ${button("Link child")}
               </form>`
            : `<p class="field-hint">Every child on the roster is already linked to this account.</p>`
        }
      </div></div>`)}
    </div>

    <div>
      ${section("Role", `<div class="card"><div class="card-pad">
        ${
          isLastAdmin
            ? banner("This is the only admin account. Demoting it would lock everyone out of the panel.", "danger")
            : `${formStart(`${base}/role`, csrf)}
                ${selectField("role", "Account role", [
                  { value: "parent", label: "Parent" },
                  { value: "admin", label: "Admin" },
                ], user.role)}
                <p class="field-hint">Admins see every child, every album, and this panel.</p>
                ${button("Save role")}
               </form>`
        }
      </div></div>`)}

      ${section("Danger zone", `<div class="card"><div class="card-pad">
        <p class="sub">Created ${escapeHtml(owned.events)} album${owned.events === 1 ? "" : "s"},
           ${escapeHtml(owned.photos)} photo${owned.photos === 1 ? "" : "s"},
           ${escapeHtml(owned.announcements)} announcement${owned.announcements === 1 ? "" : "s"},
           ${escapeHtml(owned.invites)} invite code${owned.invites === 1 ? "" : "s"},
           ${escapeHtml(owned.tips)} tip${owned.tips === 1 ? "" : "s"}.</p>
        ${linkButton(`${base}/delete`, "Delete this account", "danger")}
      </div></div>`)}
    </div>
  </div>`;

  res.type("html").send(
    layout({
      active: "users",
      title: user.name,
      heading: user.name,
      sub: user.email,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

/**
 * The confirmation page.
 *
 * A separate page rather than a dialog: it can run the cascade counts live and
 * spell out what is about to disappear, which no `confirm()` can do — and the
 * panel has no client JavaScript to put a modal in anyway.
 */
export async function userDeletePage(req: Request, res: Response) {
  const user = await UserModel.findById(String(req.params.userId));
  if (!user) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const [owned, admins, children] = await Promise.all([
    UserModel.ownedContentCounts(user.id),
    UserModel.listAdmins(),
    StudentModel.listByParent(user.id),
  ]);

  if (user.role === "admin" && admins.length <= 1) {
    return res.redirect(
      redirectWith(`${LIST}/${user.id}`, {
        err: "This is the last admin account — deleting it would lock everyone out.",
      }),
    );
  }

  const others = admins.filter((admin) => admin.id !== user.id);
  const blocked = owned.total > 0;

  const goesAway = [
    `their link to ${children.length} child${children.length === 1 ? "" : "ren"} (the ${children.length === 1 ? "child stays" : "children stay"} on the roster)`,
    "their notifications and invite redemptions",
    "their analytics history",
  ];
  const staysBehind = [
    "any feedback they left, with their name removed",
    "any course place they requested, with the requester removed",
  ];

  const body = `
  ${banner("This cannot be undone. There is no backup to restore a single account from.", "danger")}

  <div class="cols">
    <div>
      <h2>What gets deleted</h2>
      <div class="card">
        <ul>${goesAway.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      </div>
      <h2>What stays</h2>
      <div class="card">
        <ul>${staysBehind.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      </div>
    </div>

    <div>
      ${
        blocked
          ? `<h2>Blocked by their content</h2>
             <div class="card">
               ${banner(
                 "The database will refuse this delete while they still own academy content. Move it to another admin first.",
                 "warn",
               )}
               ${table(
                 ["Content", "Count"],
                 [
                   ["Albums", String(owned.events)],
                   ["Photos", String(owned.photos)],
                   ["Announcements", String(owned.announcements)],
                   ["Invite codes", String(owned.invites)],
                   ["Tips", String(owned.tips)],
                 ].filter((row) => row[1] !== "0"),
               )}
               ${
                 others.length
                   ? `${formStart(`${LIST}/${user.id}/reassign`, csrf)}
                       ${selectField(
                         "toId",
                         "Move all of it to",
                         others.map((admin) => ({ value: admin.id, label: `${admin.name} (${admin.email})` })),
                         req.userId,
                       )}
                       ${button("Reassign content")}
                      </form>`
                   : banner("There is no other admin to move it to. Promote someone first.", "danger")
               }
             </div>`
          : `<h2>Confirm</h2>
             <div class="card">
               <p class="sub">Type <strong>${escapeHtml(user.name)}</strong> to confirm.</p>
               ${formStart(`${LIST}/${user.id}/delete`, csrf)}
                 <label class="field">
                   <span class="field-label">Account name</span>
                   <input type="text" name="confirm" placeholder="${escapeHtml(user.name)}" autocomplete="off" required>
                 </label>
                 ${button("Delete this account for good", "danger")}
               </form>
             </div>`
      }
      <p class="sub">${linkButton(`${LIST}/${user.id}`, "Cancel")}</p>
    </div>
  </div>`;

  res.type("html").send(
    layout({
      active: "users",
      title: "Delete account",
      heading: `Delete ${user.name}?`,
      sub: user.email,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

// ------------------------------------------------------------------- actions

export async function setUserRole(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const role = String(req.body.role ?? "");
  if (role !== "admin" && role !== "parent") {
    return res.redirect(redirectWith(`${LIST}/${userId}`, { err: "Unknown role." }));
  }

  const user = await UserModel.findById(userId);
  if (!user) return res.redirect(redirectWith(LIST, { err: "That account is gone." }));

  // Demoting the last admin locks the academy out of its own panel, and out of
  // the app's admin screens with it.
  if (user.role === "admin" && role === "parent") {
    const admins = await UserModel.listAdmins();
    if (admins.length <= 1) {
      return res.redirect(
        redirectWith(`${LIST}/${userId}`, { err: "That is the last admin — promote someone else first." }),
      );
    }
  }

  await UserModel.setRole(userId, role);
  res.redirect(redirectWith(`${LIST}/${userId}`, { ok: `${user.name} is now ${role === "admin" ? "an admin" : "a parent"}.` }));
}

export async function linkChild(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const studentId = String(req.body.studentId ?? "");

  const [user, student] = await Promise.all([UserModel.findById(userId), StudentModel.findById(studentId)]);
  if (!user || !student) {
    return res.redirect(redirectWith(`${LIST}/${userId}`, { err: "Account or child not found." }));
  }

  await StudentModel.linkParent(userId, studentId);
  res.redirect(redirectWith(`${LIST}/${userId}`, { ok: `${student.name} linked. ${user.name} can now see their photos.` }));
}

export async function unlinkChild(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const studentId = String(req.body.studentId ?? "");

  const student = await StudentModel.findById(studentId);
  await StudentModel.unlinkParent(userId, studentId);
  res.redirect(
    redirectWith(`${LIST}/${userId}`, {
      ok: `${student?.name ?? "Child"} unlinked — those photos are no longer visible to this account.`,
    }),
  );
}

export async function reassignContent(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const toId = String(req.body.toId ?? "");

  const [from, to] = await Promise.all([UserModel.findById(userId), UserModel.findById(toId)]);
  if (!from || !to) return res.redirect(redirectWith(`${LIST}/${userId}`, { err: "Account not found." }));
  if (to.role !== "admin") {
    return res.redirect(redirectWith(`${LIST}/${userId}/delete`, { err: "Content can only move to an admin." }));
  }

  await UserModel.reassignContent(from.id, to.id);
  res.redirect(redirectWith(`${LIST}/${userId}/delete`, { ok: `Content moved to ${to.name}.` }));
}

export async function deleteUser(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const confirm = String(req.body.confirm ?? "").trim();

  const user = await UserModel.findById(userId);
  if (!user) return res.redirect(redirectWith(LIST, { err: "That account is already gone." }));

  if (confirm !== user.name) {
    return res.redirect(redirectWith(`${LIST}/${userId}/delete`, { err: "The name did not match. Nothing was deleted." }));
  }

  if (user.role === "admin") {
    const admins = await UserModel.listAdmins();
    if (admins.length <= 1) {
      return res.redirect(redirectWith(`${LIST}/${userId}`, { err: "That is the last admin account." }));
    }
  }

  try {
    await UserModel.remove(user.id);
  } catch {
    // The only expected failure is a Restrict violation from content created
    // between the confirmation page and this click.
    return res.redirect(
      redirectWith(`${LIST}/${userId}/delete`, { err: "They still own academy content. Reassign it first." }),
    );
  }

  res.redirect(redirectWith(LIST, { ok: `${user.name} deleted.` }));
}

function notFound(): string {
  return layout({
    active: "users",
    title: "Not found",
    heading: "No such account",
    sub: "It may already have been deleted.",
    body: `<p class="sub">${linkButton(LIST, "Back to users")}</p>`,
  });
}
