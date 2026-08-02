import { Fonts } from "./Fonts";

/**
 * Four-tier type scale. Every screen/section/body/meta text should map to one
 * of these rather than picking an ad-hoc size — that's what kept every screen
 * sitting flat between 14–22px with no hierarchy.
 */
export const Type = {
  /** Screen titles (e.g. "Gallery", event name on its detail screen). */
  display: {
    fontFamily: Fonts.extraBold,
    fontSize: 32,
    lineHeight: 38,
  },
  /** Section names within a screen ("Next Event", "Settings", "My Kids"). */
  heading: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  /** Primary content — card titles, announcement text, row labels. */
  body: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  /** Metadata — dates, timestamps, counts, helper subtext. */
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
