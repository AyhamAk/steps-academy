/**
 * Sage & gold botanical palette.
 *
 * Replaced the earth-tone Montessori palette family for family, so every
 * feature kept its relative identity: terracotta → sage (the main accent),
 * honey → gold, sky → dusty blue (nursery), clay → dusty rose, and forest →
 * soft coral (courses — it could not stay green once sage became the main
 * colour, or Courses would stop standing apart from every button).
 */
export const Colors = {
  // Neutrals
  bark: "#2C2A24",
  cream: "#FFFCF5",
  linen: "#F6EEDF",

  // The five families
  sage: "#4F8074",
  gold: "#D9A441",
  blue: "#4A90A4",
  rose: "#C97B72",
  coral: "#C15B45",

  // Deeper partners for the base hues, used as the far end of a tonal gradient.
  // Staying inside one hue family keeps a gradient clean — mixing across
  // families turns muddy through the middle.
  sageDeep: "#3B6358",
  coralDeep: "#9E4533",
  blueDeep: "#3A7384",
  goldDeep: "#A97D24",

  /** Gold at card-fill strength — the tips pillar's tinted surface. */
  goldLight: "#F0E4C8",
  /** Blue at card-fill strength — the nursery pillar's tinted surface. */
  blueTint: "#DCEAF2",
  /** Coral at card-fill strength — the courses pillar's tinted surface. */
  coralTint: "#F6DCD5",
  /** Rose at card-fill strength — the "+N more photos" tile. */
  roseLight: "#F5DCD9",
  /** Sage at chip strength — icon tiles in the main accent family. */
  sageTint: "#DDEBE3",

  // Lighter partners, used as the third stop so a slide gradient has somewhere
  // to travel to. Two stops read as a flat block; three give it depth.
  sageLight: "#7FA89C",
  coralLight: "#DC8B78",
  blueLight: "#86B6C4",

  // Semantic aliases
  primary: "#4F8074",
  primaryLight: "#DDEBE3",
  secondary: "#D9A441",
  secondaryLight: "#F0E4C8",
  accent1: "#C97B72",
  accent1Light: "#F5DCD9",
  accent2: "#4A90A4",
  accent2Light: "#DCEAF2",
  accent3: "#C15B45",
  accent3Light: "#F6DCD5",
  background: "#FBF6EC",
  card: "#F6EEDF",
  text: "#2C2A24",
  textLight: "#8A8270",
  /** Hairline dividers inside a card, and input outlines. Never a card outline. */
  border: "#E5DCC8",

  // The corner leaf decoration
  leafStem: "#8FAE9B",
  leafFillA: "#9CBBA6",
  leafFillB: "#A6C4B0",
  leafFillC: "#C9DACB",
  leafGold: "#D9A441",
} as const;

export type ColorPalette = typeof Colors;
