import { Request, Response } from "express";

import { notifyEnrollmentDecision } from "../lib/enrollmentNotify";
import { csrfToken } from "../middleware/dashboardAuth";
import { CourseModel, EnrollmentModel } from "../models/course";
import {
  banner,
  button,
  checkboxField,
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
 * Courses and the enrolment queue.
 *
 * Approving a place is the one action on this page a parent notices: it
 * writes a notification and sends a push, so it goes through the model's
 * `decide` rather than a bare update.
 */

const LIST = "/dashboard/courses";
const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu"] as const;

export async function coursesPage(req: Request, res: Response) {
  const csrf = csrfToken(req.userId!);
  const statusFilter = typeof req.query.status === "string" ? req.query.status : "pending";

  const [courses, enrollments] = await Promise.all([
    CourseModel.listWithCounts(true),
    EnrollmentModel.listAll(
      statusFilter === "all"
        ? {}
        : { status: statusFilter as "pending" | "approved" | "rejected" | "cancelled" },
    ),
  ]);

  const courseRows = courses.map((course) => [
    `<a href="${LIST}/${escapeHtml(course.id)}">${escapeHtml(course.emoji)} ${escapeHtml(course.name)}</a>`,
    escapeHtml(course.instructor ?? "—"),
    course.weekDays.length ? escapeHtml(course.weekDays.join(", ")) : `<span class="muted">—</span>`,
    escapeHtml(course.startTime ?? "—"),
    course.capacity === 0
      ? `${course.approvedCount} <span class="muted">/ unlimited</span>`
      : `${course.approvedCount} <span class="muted">/ ${course.capacity}</span>`,
    course.pendingCount
      ? `<span class="pill pill-pending">${course.pendingCount} waiting</span>`
      : `<span class="muted">—</span>`,
    course.isActive ? `<span class="pill pill-approved">active</span>` : `<span class="pill">hidden</span>`,
  ]);

  const enrollmentRows = enrollments.map((enrollment) => [
    escapeHtml(enrollment.student.name),
    escapeHtml(enrollment.course.name),
    enrollment.requester
      ? `<a href="/dashboard/users/${escapeHtml(enrollment.requester.id)}">${escapeHtml(enrollment.requester.name)}</a>`
      : `<span class="muted">account deleted</span>`,
    `<span class="pill pill-${escapeHtml(enrollment.status)}">${escapeHtml(enrollment.status)}</span>`,
    escapeHtml(shortDate(enrollment.requestedAt)),
    enrollment.status === "pending"
      ? `<div class="row-actions">
          ${formStart(`${LIST}/enrollments/${enrollment.id}/decide`, csrf, { inline: true })}
            <input type="hidden" name="status" value="approved">
            ${button("Approve")}
          </form>
          ${formStart(`${LIST}/enrollments/${enrollment.id}/decide`, csrf, { inline: true })}
            <input type="hidden" name="status" value="rejected">
            ${button("Reject", "quiet")}
          </form>
         </div>`
      : "",
  ]);

  const pendingTotal = courses.reduce((sum, course) => sum + course.pendingCount, 0);

  const body = `
  <div class="stats">
    ${statCard({ label: "Courses", value: String(courses.filter((c) => c.isActive).length), sub: `${courses.length} including hidden` })}
    ${statCard({
      label: "Waiting for a decision",
      value: String(pendingTotal),
      tone: pendingTotal ? "var(--terracotta)" : undefined,
    })}
    ${statCard({ label: "Places taken", value: String(courses.reduce((sum, c) => sum + c.approvedCount, 0)) })}
  </div>

  <h2>Courses</h2>
  <div class="card">
    ${table(["Course", "Instructor", "Days", "Time", "Places", "Waiting", ""], courseRows)}
  </div>

  <h2>Enrolments</h2>
  <form method="get" action="${LIST}" class="searchbar">
    ${selectField(
      "status",
      "",
      [
        { value: "pending", label: "Waiting" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
        { value: "all", label: "Everything" },
      ],
      statusFilter,
    )}
    ${button("Filter", "quiet")}
  </form>
  <div class="card">
    ${table(["Child", "Course", "Requested by", "Status", "When", ""], enrollmentRows)}
  </div>

  <h2>New course</h2>
  <div class="card">${courseForm(csrf, `${LIST}/new`, null)}</div>`;

  res.type("html").send(
    layout({
      active: "courses",
      title: "Courses",
      heading: "Courses",
      sub: pendingTotal ? `${pendingTotal} request${pendingTotal === 1 ? "" : "s"} waiting` : "Nothing waiting",
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function courseDetailPage(req: Request, res: Response) {
  const course = await CourseModel.findById(String(req.params.courseId));
  if (!course) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const base = `${LIST}/${course.id}`;
  const [approved, enrollments] = await Promise.all([
    CourseModel.countApproved(course.id),
    EnrollmentModel.listAll({ courseId: course.id }),
  ]);

  const body = `
  <div class="stats">
    ${statCard({ label: "Places taken", value: `${approved}${course.capacity ? ` / ${course.capacity}` : ""}` })}
    ${statCard({ label: "Requests", value: String(enrollments.length) })}
    ${statCard({ label: "Visible in the app", value: course.isActive ? "Yes" : "No" })}
  </div>

  <h2>Details</h2>
  <div class="card">${courseForm(csrf, `${base}/edit`, course)}</div>

  <h2>Who is on it</h2>
  <div class="card">
    ${table(
      ["Child", "Status", "Decided by", "Note"],
      enrollments.map((e) => [
        escapeHtml(e.student.name),
        `<span class="pill pill-${escapeHtml(e.status)}">${escapeHtml(e.status)}</span>`,
        escapeHtml(e.decider?.name ?? "—"),
        escapeHtml(e.note ?? ""),
      ]),
    )}
  </div>

  <h2>Danger zone</h2>
  <div class="card">
    <p class="sub">Deleting a course removes every place on it, approved or not. Hiding it instead
       keeps the history and takes it out of the app.</p>
    ${linkButton(`${base}/delete`, "Delete this course", "danger")}
  </div>`;

  res.type("html").send(
    layout({
      active: "courses",
      title: course.name,
      heading: `${course.emoji} ${course.name}`,
      sub: course.instructor ?? undefined,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function courseDeletePage(req: Request, res: Response) {
  const course = await CourseModel.findById(String(req.params.courseId));
  if (!course) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const approved = await CourseModel.countApproved(course.id);

  const body = `
  ${banner("This cannot be undone.", "danger")}
  <div class="card">
    <p>Deleting <strong>${escapeHtml(course.name)}</strong> removes ${approved} confirmed
       place${approved === 1 ? "" : "s"} and every pending request. Nobody is told.</p>
    ${formStart(`${LIST}/${course.id}/delete`, csrf)}
      <label class="field">
        <span class="field-label">Type <strong>${escapeHtml(course.name)}</strong> to confirm</span>
        <input type="text" name="confirm" autocomplete="off" required>
      </label>
      ${button("Delete this course", "danger")}
    </form>
    <p class="sub">${linkButton(`${LIST}/${course.id}`, "Cancel")}</p>
  </div>`;

  res.type("html").send(
    layout({
      active: "courses",
      title: "Delete course",
      heading: `Delete ${course.name}?`,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

/** One form for create and edit — the fields and their rules are identical. */
function courseForm(csrf: string, action: string, course: Awaited<ReturnType<typeof CourseModel.findById>>): string {
  const days = new Set(course?.weekDays ?? []);
  return `${formStart(action, csrf)}
    <div class="grid2">
      ${textField("name", "Name", course?.name ?? "", { required: true })}
      ${textField("emoji", "Emoji", course?.emoji ?? "🎓")}
      ${textField("instructor", "Instructor", course?.instructor ?? "")}
      ${textField("accentColor", "Accent colour", course?.accentColor ?? "", { placeholder: "#7B9EC4" })}
    </div>
    ${textArea("description", "Description", course?.description ?? "", { rows: 3 })}
    <div class="grid2">
      ${textField("nameAr", "Name (Arabic)", course?.nameAr ?? "")}
      ${textField("nameHe", "Name (Hebrew)", course?.nameHe ?? "")}
    </div>
    <div class="grid2">
      ${textArea("descriptionAr", "Description (Arabic)", course?.descriptionAr ?? "", { rows: 2 })}
      ${textArea("descriptionHe", "Description (Hebrew)", course?.descriptionHe ?? "", { rows: 2 })}
    </div>
    <div class="field">
      <span class="field-label">Days</span>
      <div class="row-actions">
        ${WEEK_DAYS.map((day) => checkboxField(`day_${day}`, day, days.has(day))).join("")}
      </div>
    </div>
    <div class="grid2">
      ${textField("startTime", "Start time", course?.startTime ?? "", { type: "time" })}
      ${textField("capacity", "Capacity", String(course?.capacity ?? 0), { type: "number", hint: "0 means unlimited." })}
      ${textField("startDate", "First day", course?.startDate ?? "", { type: "date" })}
      ${textField("endDate", "Last day", course?.endDate ?? "", { type: "date" })}
      ${textField("ageMinYears", "Youngest age", course?.ageMinYears?.toString() ?? "", { type: "number" })}
      ${textField("ageMaxYears", "Oldest age", course?.ageMaxYears?.toString() ?? "", { type: "number" })}
    </div>
    ${checkboxField("isActive", "Visible in the app", course ? course.isActive : true)}
    ${button(course ? "Save changes" : "Create course")}
  </form>`;
}

// ------------------------------------------------------------------- actions

function orNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function numberOrNull(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Same rules the app's admin screens enforce, checked again here because this
 * page talks to the model directly rather than through the API.
 */
function readCourse(body: Record<string, unknown>): { error: string } | { input: Parameters<typeof CourseModel.create>[0] } {
  const name = String(body.name ?? "").trim();
  if (!name) return { error: "A course needs a name." };

  const startTime = orNull(body.startTime);
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) return { error: "Start time must look like 15:30." };

  const startDate = orNull(body.startDate);
  const endDate = orNull(body.endDate);
  if (startDate && endDate && endDate < startDate) return { error: "The last day is before the first." };

  const ageMin = numberOrNull(body.ageMinYears);
  const ageMax = numberOrNull(body.ageMaxYears);
  if (ageMin != null && ageMax != null && ageMax < ageMin) return { error: "The oldest age is below the youngest." };

  return {
    input: {
      name,
      nameAr: orNull(body.nameAr),
      nameHe: orNull(body.nameHe),
      description: orNull(body.description),
      descriptionAr: orNull(body.descriptionAr),
      descriptionHe: orNull(body.descriptionHe),
      emoji: String(body.emoji ?? "").trim() || "🎓",
      instructor: orNull(body.instructor),
      weekDays: WEEK_DAYS.filter((day) => body[`day_${day}`] === "1"),
      startTime,
      startDate,
      endDate,
      ageMinYears: ageMin,
      ageMaxYears: ageMax,
      capacity: numberOrNull(body.capacity) ?? 0,
      accentColor: orNull(body.accentColor),
      isActive: body.isActive === "1",
    },
  };
}

export async function createCourse(req: Request, res: Response) {
  const parsed = readCourse(req.body as Record<string, unknown>);
  if ("error" in parsed) return res.redirect(redirectWith(LIST, { err: parsed.error }));

  const course = await CourseModel.create(parsed.input);
  res.redirect(redirectWith(`${LIST}/${course.id}`, { ok: `${course.name} created.` }));
}

export async function updateCourse(req: Request, res: Response) {
  const courseId = String(req.params.courseId);
  const parsed = readCourse(req.body as Record<string, unknown>);
  if ("error" in parsed) return res.redirect(redirectWith(`${LIST}/${courseId}`, { err: parsed.error }));

  await CourseModel.update(courseId, parsed.input);
  res.redirect(redirectWith(`${LIST}/${courseId}`, { ok: "Saved." }));
}

export async function deleteCourse(req: Request, res: Response) {
  const courseId = String(req.params.courseId);
  const course = await CourseModel.findById(courseId);
  if (!course) return res.redirect(redirectWith(LIST, { err: "That course is already gone." }));

  if (String(req.body.confirm ?? "").trim() !== course.name) {
    return res.redirect(redirectWith(`${LIST}/${courseId}/delete`, { err: "The name did not match." }));
  }

  await CourseModel.remove(courseId);
  res.redirect(redirectWith(LIST, { ok: `${course.name} deleted.` }));
}

export async function decideEnrollment(req: Request, res: Response) {
  const enrollmentId = String(req.params.enrollmentId);
  const status = String(req.body.status ?? "");
  if (status !== "approved" && status !== "rejected") {
    return res.redirect(redirectWith(LIST, { err: "Unknown decision." }));
  }

  const enrollment = await EnrollmentModel.findById(enrollmentId);
  if (!enrollment) return res.redirect(redirectWith(LIST, { err: "That request is gone." }));

  // Capacity is only enforced at approval — the app does the same, so a full
  // course still collects a waiting list.
  if (status === "approved" && enrollment.course.capacity > 0) {
    const approved = await CourseModel.countApproved(enrollment.courseId);
    if (approved >= enrollment.course.capacity && req.body.allowOverCapacity !== "1") {
      return res.redirect(
        redirectWith(LIST, {
          err: `${enrollment.course.name} is full (${approved}/${enrollment.course.capacity}). Raise the capacity to take them.`,
        }),
      );
    }
  }

  const decided = await EnrollmentModel.decide(enrollmentId, status, req.userId!, orNull(req.body.note));
  if (!decided) return res.redirect(redirectWith(LIST, { err: "That request is gone." }));

  await notifyEnrollmentDecision(decided, status);

  res.redirect(
    redirectWith(LIST, {
      ok: `${enrollment.student.name} ${status === "approved" ? "has a place" : "was turned down"}. Their parent has been notified.`,
    }),
  );
}

function notFound(): string {
  return layout({
    active: "courses",
    title: "Not found",
    heading: "No such course",
    body: `<p class="sub">${linkButton(LIST, "Back to courses")}</p>`,
  });
}
