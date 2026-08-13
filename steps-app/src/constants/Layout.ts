/** Shared fixed dimensions, so real content and its loading skeleton agree. */
export const Layout = {
  /**
   * Course cards sit in a horizontal strip, so they must all be the same size
   * regardless of how much a given course has filled in. Courses vary: some
   * have weekday and date lines, some have neither, and names wrap to one or
   * two lines. Letting the card size itself gives a ragged, broken-looking row.
   *
   * Tall enough for the worst case: emoji + two-line name + both meta lines +
   * spots badge + action button.
   */
  courseCard: {
    width: 176,
    height: 268,
    /** Two caption lines (18px) plus their 4px top margins. */
    metaBlockHeight: 44,
    /** Two lines of the 20px-lineHeight name. */
    nameHeight: 40,
  },
} as const;
