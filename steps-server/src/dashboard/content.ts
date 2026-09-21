import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { sendPushToUsers } from "../lib/push";
import { announcementPosted } from "../lib/pushCopy";
import { deleteObjects } from "../lib/r2";
import { becamePublished, notifyTipPublished } from "../lib/tipNotify";
import { csrfToken } from "../middleware/dashboardAuth";
import { AnnouncementModel } from "../models/announcement";
import { EventModel } from "../models/event";
import { NotificationModel } from "../models/notification";
import { PhotoModel } from "../models/photo";
import { ScheduleModel, WEEK_DAYS, isWeekDay } from "../models/schedule";
import { SETTING_KEYS, SettingModel } from "../models/setting";
import { TipModel } from "../models/tip";
import { UserModel } from "../models/user";
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
  drawer,
  padCard,
  section,
  shortDate,
  statCard,
  table,
  tableCard,
  textArea,
  textField,
} from "../utils/html";

/**
 * Everything the academy publishes: albums, announcements, tips, the weekly
 * schedule and the gallery quote.
 *
 * Two things here reach a parent's phone the moment they are clicked — posting
 * an announcement and publishing an album — so both say so before you do it.
 */

const LIST = "/dashboard/content";

export async function contentPage(req: Request, res: Response) {
  const csrf = csrfToken(req.userId!);

  const [albums, tips, schedule, quote, latest] = await Promise.all([
    EventModel.listWithPhotoCounts(100, 0, 1),
    TipModel.listAll(),
    ScheduleModel.listWeek(),
    SettingModel.get(SETTING_KEYS.galleryQuote),
    AnnouncementModel.findLatest(),
  ]);

  const albumRows = albums.map((album) => [
    `<a href="${LIST}/albums/${escapeHtml(album.id)}">${escapeHtml(album.name)}</a>`,
    escapeHtml(album.date),
    String(album.photoCount),
    String(album.attendees.length),
    album.notifiedAt
      ? `<span class="pill pill-approved">published</span>`
      : `<span class="pill pill-pending">draft</span>`,
    `<div class="row-actions">${linkButton(`${LIST}/albums/${album.id}`, "Open")}</div>`,
  ]);

  const tipRows = tips.map((tip) => [
    `<a href="${LIST}/tips/${escapeHtml(tip.id)}">${escapeHtml(tip.emoji)} ${escapeHtml(tip.title)}</a>`,
    `${tip.month}/${tip.year}`,
    `${tip.minutes} min`,
    tip.isPublished
      ? `<span class="pill pill-approved">published</span>`
      : `<span class="pill pill-pending">draft</span>`,
    `<div class="row-actions">${linkButton(`${LIST}/tips/${tip.id}`, "Edit")}</div>`,
  ]);

  const scheduleRows = schedule.map((activity) => [
    escapeHtml(activity.day),
    `${escapeHtml(activity.emoji)} ${escapeHtml(activity.name)}`,
    escapeHtml(activity.startTime),
    `${activity.durationMinutes} min`,
    `${formStart(`${LIST}/schedule/${activity.id}/delete`, csrf, { inline: true })}${button("Remove", "quiet")}</form>`,
  ]);

  const body = `
  <div class="stats">
    ${statCard({ label: "Albums", value: String(albums.length) })}
    ${statCard({ label: "Tips", value: String(tips.length), sub: `${tips.filter((t) => t.isPublished).length} published` })}
    ${statCard({ label: "Weekly activities", value: String(schedule.length) })}
  </div>

  ${section(
    "Albums",
    `${tableCard(["Album", "Date", "Photos", "Children", "Status", ""], albumRows, {
       hideOnPhone: [2, 3],
     })}
     ${drawer(
       "Create an album",
       `${formStart(`${LIST}/albums`, csrf)}
          <div class="grid2">
            ${textField("name", "Album name", "", { required: true })}
            ${textField("date", "Date", "", { type: "date", required: true })}
          </div>
          ${button("Create album")}
        </form>
        <p class="field-hint">Photos are uploaded from the app — this panel manages albums, not files.</p>`,
     )}`,
    `${albums.length} total`,
  )}

  <div class="cols">
    <div>
      ${section("Announcement", `<div class="card"><div class="card-pad">
        ${banner("Posting notifies every parent and sends a push straight away.", "warn")}
        ${latest ? `<p class="sub">Last posted ${escapeHtml(shortDate(latest.createdAt))}: “${escapeHtml(latest.text.slice(0, 120))}”</p>` : ""}
        ${formStart(`${LIST}/announcements`, csrf)}
          ${textArea("text", "Message", "", { rows: 4, hint: "Up to 2000 characters." })}
          ${button("Post to every parent")}
        </form>
      </div></div>`)}
    </div>

    <div>
      ${section("Gallery quote", `<div class="card"><div class="card-pad">
        <p class="sub">The line above the photo gallery. Clearing it hides the quote.</p>
        ${formStart(`${LIST}/quote`, csrf)}
          ${textArea("quote", "Quote", quote ?? "", { rows: 2, hint: "Up to 280 characters." })}
          ${button("Save quote")}
        </form>
      </div></div>`)}
    </div>
  </div>

  ${section(
    "Parenting tips",
    `${tableCard(["Tip", "Month", "Read time", "Status", ""], tipRows, { hideOnPhone: [2] })}
     ${padCard(linkButton(`${LIST}/tips/new`, "Write a new tip", "primary"))}`,
    `${tips.filter((t) => t.isPublished).length} published`,
  )}

  ${section(
    "Weekly schedule",
    `${tableCard(["Day", "Activity", "Starts", "Lasts", ""], scheduleRows)}
     ${drawer(
       "Add an activity",
       `${formStart(`${LIST}/schedule`, csrf)}
      <div class="grid2">
        ${selectField("day", "Day", WEEK_DAYS.map((day) => ({ value: day, label: day })))}
        ${textField("name", "Activity", "", { required: true })}
        ${textField("emoji", "Emoji", "🎨")}
        ${textField("startTime", "Starts", "", { type: "time", required: true })}
        ${textField("durationMinutes", "Minutes", "45", { type: "number" })}
        ${textField("accentColor", "Accent colour", "", { placeholder: "#D4A843" })}
      </div>
      ${button("Add activity")}
        </form>`,
     )}`,
  )}`;

  res.type("html").send(
    layout({
      active: "content",
      title: "Content",
      heading: "Content",
      sub: "Albums, announcements, tips and the weekly schedule",
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function albumPage(req: Request, res: Response) {
  const album = await EventModel.findById(String(req.params.eventId));
  if (!album) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const base = `${LIST}/albums/${album.id}`;
  const photoCount = await PhotoModel.countByEvent(album.id);

  const body = `
  <div class="stats">
    ${statCard({ label: "Photos", value: String(photoCount) })}
    ${statCard({ label: "Children on it", value: String(album.attendees.length) })}
    ${statCard({
      label: "Published",
      value: album.notifiedAt ? shortDate(album.notifiedAt) : "Not yet",
      sub: album.notifiedAt ? "parents have been told" : "nobody has been notified",
    })}
  </div>

  <div class="cols">
    <div>
      ${section("Details", `<div class="card"><div class="card-pad">
        ${formStart(`${base}/edit`, csrf)}
          ${textField("name", "Album name", album.name, { required: true })}
          ${textField("date", "Date", album.date, { type: "date", required: true })}
          ${textArea("caption", "Caption", album.caption ?? "", { rows: 2, hint: "Up to 300 characters." })}
          ${button("Save changes")}
        </form>
      </div></div>`)}

      ${section("Publish", `<div class="card"><div class="card-pad">
        ${banner(
          album.notifiedAt
            ? "Publishing again only notifies the guardians of children tagged since the last time."
            : "Publishing notifies the guardians of every child on this album.",
          "warn",
        )}
        ${formStart(`${base}/publish`, csrf)}${button(album.notifiedAt ? "Publish updates" : "Publish album")}</form>
      </div></div>`)}
    </div>

    <div>
      ${section("Children on this album", `<div class="card"><div class="card-pad">
        ${
          album.attendees.length
            ? `<ul>${album.attendees.map((child) => `<li>${escapeHtml(child.name)}</li>`).join("")}</ul>`
            : `<p class="empty">Nobody is on this album yet, so nobody can see it.</p>`
        }
        <p class="field-hint">Attendance is set from the app when the album is created.</p>
      </div></div>`)}

      ${section("Danger zone", `<div class="card"><div class="card-pad">
        <p class="sub">Deleting removes ${photoCount} photograph${photoCount === 1 ? "" : "s"} from the
           gallery and from storage. This cannot be undone.</p>
        ${formStart(`${base}/delete`, csrf)}
          <label class="field">
            <span class="field-label">Type <strong>${escapeHtml(album.name)}</strong> to confirm</span>
            <input type="text" name="confirm" autocomplete="off" required>
          </label>
          ${button("Delete this album", "danger")}
      </div></div>`)}
    </div>
  </div>`;

  res.type("html").send(
    layout({
      active: "content",
      title: album.name,
      heading: album.name,
      sub: album.date,
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

export async function tipPage(req: Request, res: Response) {
  const id = String(req.params.tipId);
  const tip = id === "new" ? null : await TipModel.findById(id);
  if (id !== "new" && !tip) return res.status(404).type("html").send(notFound());

  const csrf = csrfToken(req.userId!);
  const now = new Date();

  const body = `
  <div class="card"><div class="card-pad">
    ${formStart(tip ? `${LIST}/tips/${tip.id}/edit` : `${LIST}/tips`, csrf)}
      <div class="grid2">
        ${textField("emoji", "Emoji", tip?.emoji ?? "💡")}
        ${textField("title", "Title", tip?.title ?? "", { required: true })}
        ${textField("month", "Month", String(tip?.month ?? now.getMonth() + 1), { type: "number" })}
        ${textField("year", "Year", String(tip?.year ?? now.getFullYear()), { type: "number" })}
        ${textField("minutes", "Read time (minutes)", String(tip?.minutes ?? 3), { type: "number" })}
      </div>
      ${textArea("excerpt", "Excerpt", tip?.excerpt ?? "", { rows: 2, hint: "The line shown in the list. Up to 400 characters." })}
      ${textArea("body", "Body", tip?.body ?? "", { rows: 10 })}
      <div class="grid2">
        ${textField("titleAr", "Title (Arabic)", tip?.titleAr ?? "")}
        ${textField("titleHe", "Title (Hebrew)", tip?.titleHe ?? "")}
      </div>
      <div class="grid2">
        ${textArea("bodyAr", "Body (Arabic)", tip?.bodyAr ?? "", { rows: 5 })}
        ${textArea("bodyHe", "Body (Hebrew)", tip?.bodyHe ?? "", { rows: 5 })}
      </div>
      ${checkboxField("isPublished", "Published — visible to parents", tip?.isPublished ?? false)}
      ${
        tip?.isPublished
          ? `<p class="field-hint">Already published. Saving again does not notify anyone.</p>`
          : banner("Publishing notifies every parent and sends a push.", "warn")
      }
      ${button(tip ? "Save tip" : "Create tip")}
    </form>
  </div></div>

  ${
    tip
      ? `${section("Danger zone", `<div class="card"><div class="card-pad">
           ${formStart(`${LIST}/tips/${tip.id}/delete`, csrf)}
             <label class="field">
               <span class="field-label">Type <strong>${escapeHtml(tip.title)}</strong> to confirm</span>
               <input type="text" name="confirm" autocomplete="off" required>
             </label>
             ${button("Delete this tip", "danger")}
           </form>
         </div></div>`)}`
      : ""
  }
  <p class="sub">${linkButton(LIST, "Back to content")}</p>`;

  res.type("html").send(
    layout({
      active: "content",
      title: tip ? tip.title : "New tip",
      heading: tip ? tip.title : "New tip",
      who: res.locals.adminName,
      flash: flashFrom(req.query as Record<string, unknown>),
      body,
    }),
  );
}

// ------------------------------------------------------------------- actions

function orNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createAlbum(req: Request, res: Response) {
  const name = String(req.body.name ?? "").trim();
  const date = String(req.body.date ?? "").trim();
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.redirect(redirectWith(LIST, { err: "An album needs a name and a date." }));
  }

  const album = await EventModel.create({ name, date, attendeeIds: [], createdBy: req.userId! });
  res.redirect(
    redirectWith(`${LIST}/albums/${album.id}`, { ok: "Album created. Add the children and photos from the app." }),
  );
}

export async function updateAlbum(req: Request, res: Response) {
  const eventId = String(req.params.eventId);
  const name = String(req.body.name ?? "").trim();
  const date = String(req.body.date ?? "").trim();
  const caption = orNull(req.body.caption);

  if (!name) return res.redirect(redirectWith(`${LIST}/albums/${eventId}`, { err: "An album needs a name." }));
  if (caption && caption.length > 300) {
    return res.redirect(redirectWith(`${LIST}/albums/${eventId}`, { err: "The caption is over 300 characters." }));
  }

  await EventModel.updateDetails(eventId, { name, date });
  await EventModel.updateCaption(eventId, caption);
  res.redirect(redirectWith(`${LIST}/albums/${eventId}`, { ok: "Saved." }));
}

/**
 * Publishing is a watermark, not a flag: the first time it tells the guardians
 * of everyone on the album, and after that only the guardians of children
 * tagged in photos added since.
 */
export async function publishAlbum(req: Request, res: Response) {
  const eventId = String(req.params.eventId);
  const album = await EventModel.findById(eventId);
  if (!album) return res.redirect(redirectWith(LIST, { err: "That album is gone." }));

  const isFirst = !album.notifiedAt;
  const studentIds = isFirst
    ? album.attendees.map((child) => child.id)
    : await PhotoModel.studentIdsTaggedSince(eventId, album.notifiedAt!);

  if (studentIds.length === 0) {
    return res.redirect(
      redirectWith(`${LIST}/albums/${eventId}`, { ok: "Nothing new since the last publish — nobody was notified." }),
    );
  }

  const links = await prisma.parentStudent.findMany({
    where: { studentId: { in: studentIds } },
    select: { parentId: true },
  });
  const guardianIds = [...new Set(links.map((link) => link.parentId))];

  if (guardianIds.length > 0) {
    await NotificationModel.createForUsers(guardianIds, { type: "photo", eventId, eventName: album.name });
  }
  await EventModel.markNotified(eventId);

  res.redirect(
    redirectWith(`${LIST}/albums/${eventId}`, {
      ok: `${guardianIds.length} famil${guardianIds.length === 1 ? "y has" : "ies have"} been notified.`,
    }),
  );
}

export async function deleteAlbum(req: Request, res: Response) {
  const eventId = String(req.params.eventId);
  const album = await EventModel.findById(eventId);
  if (!album) return res.redirect(redirectWith(LIST, { err: "That album is already gone." }));

  if (String(req.body.confirm ?? "").trim() !== album.name) {
    return res.redirect(redirectWith(`${LIST}/albums/${eventId}`, { err: "The name did not match." }));
  }

  // Collect the storage keys before the rows cascade away — afterwards there
  // is nothing left to say which objects belonged to this album.
  const photos = await prisma.photo.findMany({
    where: { eventId },
    select: { key: true, thumbKey: true, mediumKey: true },
  });
  await EventModel.remove(eventId);
  await deleteObjects(photos.flatMap((photo) => [photo.key, photo.thumbKey, photo.mediumKey]));

  res.redirect(redirectWith(LIST, { ok: `${album.name} and its ${photos.length} photos deleted.` }));
}

export async function postAnnouncement(req: Request, res: Response) {
  const text = String(req.body.text ?? "").trim();
  if (!text) return res.redirect(redirectWith(LIST, { err: "An announcement needs some text." }));
  if (text.length > 2000) return res.redirect(redirectWith(LIST, { err: "That is over 2000 characters." }));

  const announcement = await AnnouncementModel.create({ text, createdBy: req.userId! });

  const parents = await UserModel.listParents();
  await NotificationModel.createForUsers(parents.map((parent) => parent.id), { type: "announcement" });
  await sendPushToUsers(parents, (locale) => announcementPosted(announcement.text, locale));

  res.redirect(redirectWith(LIST, { ok: `Posted to ${parents.length} parents.` }));
}

export async function saveQuote(req: Request, res: Response) {
  const quote = orNull(req.body.quote);
  if (quote && quote.length > 280) {
    return res.redirect(redirectWith(LIST, { err: "The quote is over 280 characters." }));
  }

  await SettingModel.set(SETTING_KEYS.galleryQuote, quote);
  res.redirect(redirectWith(LIST, { ok: quote ? "Quote saved." : "Quote cleared." }));
}

function readTip(body: Record<string, unknown>): { error: string } | { input: Parameters<typeof TipModel.create>[0] } {
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title) return { error: "A tip needs a title." };
  if (!text) return { error: "A tip needs a body." };

  const month = Number(body.month);
  const year = Number(body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Month must be 1 to 12." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "That year looks wrong." };

  const minutes = Number(body.minutes) || 3;
  if (minutes < 1 || minutes > 120) return { error: "Read time must be 1 to 120 minutes." };

  return {
    input: {
      emoji: String(body.emoji ?? "").trim() || "💡",
      title,
      titleAr: orNull(body.titleAr),
      titleHe: orNull(body.titleHe),
      excerpt: orNull(body.excerpt),
      body: text,
      bodyAr: orNull(body.bodyAr),
      bodyHe: orNull(body.bodyHe),
      month,
      year,
      minutes,
      isPublished: body.isPublished === "1",
      createdBy: "",
    },
  };
}

export async function createTip(req: Request, res: Response) {
  const parsed = readTip(req.body as Record<string, unknown>);
  if ("error" in parsed) return res.redirect(redirectWith(`${LIST}/tips/new`, { err: parsed.error }));

  const tip = await TipModel.create({ ...parsed.input, createdBy: req.userId! });
  const told = becamePublished(null, tip);
  if (told) await notifyTipPublished(tip);

  res.redirect(
    redirectWith(`${LIST}/tips/${tip.id}`, {
      ok: told ? "Tip published — every parent has been notified." : "Draft saved. Nobody is told until you publish.",
    }),
  );
}

export async function updateTip(req: Request, res: Response) {
  const tipId = String(req.params.tipId);
  const parsed = readTip(req.body as Record<string, unknown>);
  if ("error" in parsed) return res.redirect(redirectWith(`${LIST}/tips/${tipId}`, { err: parsed.error }));

  const { createdBy: _ignored, ...input } = parsed.input;
  // Same rule as the app: only the draft → published crossing notifies, so
  // fixing a typo on a live tip stays silent.
  const before = await TipModel.findById(tipId);
  const tip = await TipModel.update(tipId, input);
  if (!tip) return res.redirect(redirectWith(LIST, { err: "That tip is gone." }));

  const told = becamePublished(before, tip);
  if (told) await notifyTipPublished(tip);

  res.redirect(
    redirectWith(`${LIST}/tips/${tipId}`, {
      ok: told ? "Published — every parent has been notified." : "Saved.",
    }),
  );
}

export async function deleteTip(req: Request, res: Response) {
  const tipId = String(req.params.tipId);
  const tip = await TipModel.findById(tipId);
  if (!tip) return res.redirect(redirectWith(LIST, { err: "That tip is already gone." }));

  if (String(req.body.confirm ?? "").trim() !== tip.title) {
    return res.redirect(redirectWith(`${LIST}/tips/${tipId}`, { err: "The title did not match." }));
  }

  await TipModel.remove(tipId);
  res.redirect(redirectWith(LIST, { ok: `“${tip.title}” deleted.` }));
}

export async function createActivity(req: Request, res: Response) {
  const day = String(req.body.day ?? "");
  const name = String(req.body.name ?? "").trim();
  const startTime = String(req.body.startTime ?? "").trim();

  if (!isWeekDay(day)) return res.redirect(redirectWith(LIST, { err: "Pick a day of the week." }));
  if (!name) return res.redirect(redirectWith(LIST, { err: "An activity needs a name." }));
  if (!/^\d{2}:\d{2}$/.test(startTime)) return res.redirect(redirectWith(LIST, { err: "Start time must look like 09:30." }));

  await ScheduleModel.create({
    day,
    name,
    emoji: String(req.body.emoji ?? "").trim() || undefined,
    startTime,
    durationMinutes: Number(req.body.durationMinutes) || undefined,
    accentColor: orNull(req.body.accentColor),
  });

  res.redirect(redirectWith(LIST, { ok: `${name} added to ${day}.` }));
}

export async function deleteActivity(req: Request, res: Response) {
  await ScheduleModel.remove(String(req.params.activityId));
  res.redirect(redirectWith(LIST, { ok: "Activity removed." }));
}

function notFound(): string {
  return layout({
    active: "content",
    title: "Not found",
    heading: "Not found",
    body: `<p class="sub">${linkButton(LIST, "Back to content")}</p>`,
  });
}
