/**
 * Sentry has to initialise before anything it instruments (http, express,
 * prisma) is imported, so this module exists purely to be the very first
 * import in `index.ts`. Folding the call into `index.ts` itself would put it
 * after that file's own import block, which is too late.
 */
import { initSentry } from "./lib/sentry";

initSentry();
