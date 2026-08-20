import { Ionicons } from "@expo/vector-icons";

/**
 * The line icon that stands in for a course's emoji.
 *
 * Courses carry an emoji the academy picked in the admin form, but a card that
 * puts 🏊 beside an Ionicons clock and calendar reads as two different icon
 * sets in one row — and emoji render differently on every platform. The emoji
 * stays in the database (the admin form is still the place to choose one); the
 * parent-facing cards map it onto the same vector set as everything else.
 *
 * Anything unmapped falls back to a generic course icon rather than nothing.
 */
const ICON_BY_EMOJI: Record<string, keyof typeof Ionicons.glyphMap> = {
  "🏊": "water-outline",
  "🏊‍♂️": "water-outline",
  "🏊‍♀️": "water-outline",
  "✍️": "create-outline",
  "✍": "create-outline",
  "📝": "create-outline",
  "🎨": "color-palette-outline",
  "⚽": "football-outline",
  "🏀": "basketball-outline",
  "🎵": "musical-notes-outline",
  "🎶": "musical-notes-outline",
  "📚": "book-outline",
  "📖": "book-outline",
  "🧮": "calculator-outline",
  "🔬": "flask-outline",
  "💻": "laptop-outline",
  "🤖": "hardware-chip-outline",
  "🎓": "school-outline",
  "🍳": "restaurant-outline",
  "🌱": "leaf-outline",
  "🏃": "walk-outline",
  "🧘": "body-outline",
  "🗣": "chatbubbles-outline",
  "🎭": "happy-outline",
  "📷": "camera-outline",
  "🕌": "moon-outline",
  "⭐": "star-outline",
};

export function courseIcon(emoji: string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!emoji) return "school-outline";
  // Variation selectors and skin-tone modifiers would miss an exact-key match.
  const base = emoji.trim();
  return ICON_BY_EMOJI[base] ?? ICON_BY_EMOJI[base.replace(/[️‍].*$/u, "")] ?? "school-outline";
}
