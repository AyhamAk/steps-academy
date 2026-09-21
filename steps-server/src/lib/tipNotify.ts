import { NotificationModel } from "../models/notification";
import { Tip } from "../models/tip";
import { UserModel } from "../models/user";

import { sendPushToUsers } from "./push";
import { tipPublished } from "./pushCopy";

/**
 * Tells every parent a tip has been published.
 *
 * Shared by the app's tips screen and the control panel, the same way course
 * decisions are, so a tip written on a laptop reaches families exactly as one
 * written on a phone does.
 *
 * Only ever called on the draft → published transition. Firing on save would
 * push the whole academy every time a typo was fixed, and firing on create
 * would announce drafts.
 */
export async function notifyTipPublished(tip: Tip): Promise<void> {
  const parents = await UserModel.listParents();
  if (parents.length === 0) return;

  await NotificationModel.createForUsers(
    parents.map((parent) => parent.id),
    { type: "tip", tipId: tip.id, tipTitle: tip.title },
  );

  await sendPushToUsers(parents, (locale) => tipPublished(tip.title, locale));
}

/**
 * Did this save turn a draft into something parents can read?
 *
 * Kept next to the sender so both call sites ask the question the same way —
 * an already-published tip being edited must stay silent.
 */
export function becamePublished(before: Tip | null, after: Tip): boolean {
  return after.isPublished && !before?.isPublished;
}
