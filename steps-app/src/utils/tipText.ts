import { Locale } from "../store/localeStore";
import { Tip } from "../services/tipsApi";

/**
 * A tip's text in the reader's language, falling back to the academy's own
 * wording.
 *
 * The same shape as `courseText`: a tip is publishable as soon as it exists in
 * one language, so an untranslated field shows the base rather than a blank.
 */
function pick(base: string, ar: string | null, he: string | null, locale: Locale): string {
  if (locale === "ar") return ar?.trim() || base;
  if (locale === "he") return he?.trim() || base;
  return base;
}

export function tipTitle(tip: Tip, locale: Locale): string {
  return pick(tip.title, tip.titleAr, tip.titleHe, locale);
}

export function tipBody(tip: Tip, locale: Locale): string {
  return pick(tip.body, tip.bodyAr, tip.bodyHe, locale);
}

/** Empty when the academy wrote none — the card then closes up. */
export function tipExcerpt(tip: Tip, locale: Locale): string {
  return pick(tip.excerpt ?? "", tip.excerptAr, tip.excerptHe, locale);
}
