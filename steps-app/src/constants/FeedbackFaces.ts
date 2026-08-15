/**
 * The 1-5 scale, shared by the parent's rating sheet and the admin's list, so
 * a face can never mean one thing on the way in and another on the way out.
 */
export const FEEDBACK_FACES = [
  { rating: 1, emoji: "😞" },
  { rating: 2, emoji: "😕" },
  { rating: 3, emoji: "🙂" },
  { rating: 4, emoji: "😊" },
  { rating: 5, emoji: "🤩" },
] as const;

/** Falls back to the neutral face if a rating outside 1-5 ever arrives. */
export function faceForRating(rating: number): string {
  return FEEDBACK_FACES.find((face) => face.rating === rating)?.emoji ?? "🙂";
}
