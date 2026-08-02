export const Colors = {
  bark: "#2C2416",
  cream: "#FFFDF8",
  linen: "#F5EFE4",
  terracotta: "#E07A3A",
  forest: "#5B8A5E",
  honey: "#D4A843",
  sky: "#7B9EC4",
  clay: "#C4756A",

  primary: "#E07A3A",
  secondary: "#C4756A",
  accent1: "#5B8A5E",
  accent2: "#D4A843",
  accent3: "#7B9EC4",
  background: "#FFFDF8",
  card: "#F5EFE4",
  text: "#2C2416",
  textLight: "#8C7B65",
  border: "#E5DCC8",
} as const;

export type ColorPalette = typeof Colors;
