import { PushPayload } from "./push";

/**
 * Push copy, written in the language the parent reads the app in.
 *
 * The body of a push is rendered by the operating system, so it cannot be
 * translated on the device the way in-app text is — it has to arrive already
 * in the right language. `User.locale` is what the app last reported.
 *
 * Deliberately short. A notification is a nudge to open the app, not the news
 * itself: a title that names the kind of thing, a body that names the thing.
 */
export type PushLocale = "en" | "ar" | "he";

export function toPushLocale(locale: string | null | undefined): PushLocale {
  return locale === "ar" || locale === "he" ? locale : "en";
}

type Copy = Record<PushLocale, string>;

const pick = (copy: Copy, locale: PushLocale) => copy[locale];

/** A finished album is ready for families to look at. */
export function albumPublished(eventName: string, locale: PushLocale): PushPayload {
  return {
    title: pick({ en: "New photos", ar: "صور جديدة", he: "תמונות חדשות" }, locale),
    body: eventName,
    data: { type: "event" },
  };
}

export function announcementPosted(text: string, locale: PushLocale): PushPayload {
  return {
    title: pick({ en: "Announcement", ar: "إعلان", he: "הודעה" }, locale),
    body: text.length > 150 ? `${text.slice(0, 150)}…` : text,
    data: { type: "announcement" },
  };
}

export function coursePlaceConfirmed(
  childName: string,
  courseName: string,
  locale: PushLocale
): PushPayload {
  return {
    title: pick({ en: "Place confirmed", ar: "تم تأكيد المقعد", he: "המקום אושר" }, locale),
    body: pick(
      {
        en: `${childName} — ${courseName}`,
        ar: `${childName} — ${courseName}`,
        he: `${childName} — ${courseName}`,
      },
      locale
    ),
    data: { type: "course" },
  };
}

export function coursePlaceDeclined(
  childName: string,
  courseName: string,
  locale: PushLocale
): PushPayload {
  return {
    title: pick({ en: "Request declined", ar: "لم يتم قبول الطلب", he: "הבקשה נדחתה" }, locale),
    body: `${childName} — ${courseName}`,
    data: { type: "course" },
  };
}

/* ---- admin-facing ---- */

export function waitlistRequest(
  childName: string,
  courseName: string,
  locale: PushLocale
): PushPayload {
  return {
    title: pick({ en: "Waiting list", ar: "قائمة الانتظار", he: "רשימת המתנה" }, locale),
    body: `${childName} — ${courseName}`,
    data: { type: "course" },
  };
}

export function childLeftCourse(
  childName: string,
  courseName: string,
  locale: PushLocale
): PushPayload {
  return {
    title: pick({ en: "Left a course", ar: "انسحب من دورة", he: "עזב קורס" }, locale),
    body: `${childName} — ${courseName}`,
    data: { type: "course" },
  };
}
