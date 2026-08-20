/**
 * Bidirectional text helpers.
 *
 * A Latin run like "3:30 PM" dropped into an Arabic line has no direction of
 * its own as far as the bidi algorithm is concerned — it inherits the
 * paragraph's, and the surrounding RTL context reorders it. That is how
 * "8:30 AM · 30 دقيقة" ended up with AM sitting between the two numbers.
 *
 * Isolating the run tells the algorithm to resolve it independently and treat
 * the whole thing as a single neutral object in the outer line, so it keeps
 * its internal order wherever it lands.
 */

/** FIRST STRONG ISOLATE — direction taken from the run's own first strong character. */
const FSI = "⁨";
/** LEFT-TO-RIGHT ISOLATE — forces the run left-to-right regardless of content. */
const LRI = "⁦";
/** POP DIRECTIONAL ISOLATE — closes either of the above. */
const PDI = "⁩";

/** Non-breaking space: keeps "3:30" and "PM" on the same line. */
export const NBSP = " ";

/**
 * Isolate a run that should always read left-to-right — times, numbers with
 * Latin units, IDs. Use this for anything whose order is fixed even when the
 * text around it is Arabic or Hebrew.
 */
export function ltrIsolate(text: string): string {
  return `${LRI}${text}${PDI}`;
}

/**
 * Isolate a run whose direction should follow its own content — a name, a
 * course title, anything the academy typed and could be in either script.
 */
export function autoIsolate(text: string): string {
  return `${FSI}${text}${PDI}`;
}
