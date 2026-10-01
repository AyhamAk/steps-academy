import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";
import { leafPath } from "./CornerLeafDecoration";

/**
 * The quiet decoration inside a card: a small leafy sprig tucked into the
 * bottom-end corner — a short stem, two or three leaves and a few gold flecks.
 *
 * It stays in its corner at every card size: a fixed box, never stretched to
 * fill the card. Kept pale so it sits behind the content.
 *
 * Several variants, so a grid of cards reads as different places rather than
 * one stamp repeated. Callers pass the card's index and each card picks its
 * own variant.
 *
 * The card should clip (overflow: "hidden"); the sprig never takes taps.
 */

type Leaf = { cx: number; cy: number; rx: number; ry: number; rotate: number };

type Variant = {
  stem: string;
  leaves: Leaf[];
  dots: [number, number, number][];
};

// Drawn in a 90×70 box growing out of the bottom-right corner; mirrored for
// RTL so it sits at the end side, as in the design reference.
const VARIANTS: Variant[] = [
  {
    stem: "M90,70 Q74,60 70,42 Q67,30 56,24",
    leaves: [
      { cx: 60, cy: 30, rx: 10, ry: 4.5, rotate: 30 },
      { cx: 78, cy: 46, rx: 9, ry: 4, rotate: -35 },
      { cx: 64, cy: 50, rx: 8, ry: 3.5, rotate: 20 },
    ],
    dots: [
      [50, 20, 0.9],
      [56, 15, 0.6],
      [48, 30, 0.6],
    ],
  },
  {
    stem: "M90,62 Q72,58 62,44 Q56,36 58,26",
    leaves: [
      { cx: 60, cy: 32, rx: 9, ry: 4, rotate: -60 },
      { cx: 72, cy: 52, rx: 10, ry: 4.5, rotate: 15 },
    ],
    dots: [
      [56, 18, 0.9],
      [64, 20, 0.6],
    ],
  },
  {
    stem: "M82,70 Q78,54 66,46 Q58,42 50,44",
    leaves: [
      { cx: 56, cy: 42, rx: 9, ry: 4, rotate: -10 },
      { cx: 72, cy: 52, rx: 8, ry: 3.5, rotate: -50 },
      { cx: 80, cy: 62, rx: 7, ry: 3, rotate: 60 },
    ],
    dots: [
      [44, 40, 0.9],
      [46, 48, 0.6],
    ],
  },
  {
    stem: "M90,70 Q80,52 82,36",
    leaves: [
      { cx: 80, cy: 40, rx: 9, ry: 4, rotate: -75 },
      { cx: 74, cy: 56, rx: 8, ry: 3.5, rotate: -30 },
    ],
    dots: [
      [80, 26, 0.9],
      [86, 30, 0.6],
      [74, 30, 0.6],
    ],
  },
];

export function CardWash({ index = 0 }: { index?: number }) {
  const { isRTL } = useTranslation();
  const variant = VARIANTS[((index % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];

  return (
    <View pointerEvents="none" style={[styles.wrap, isRTL ? styles.left : styles.right]}>
      <Svg width="100%" height="100%" viewBox="0 0 90 70">
        <Path d={variant.stem} stroke={Colors.leafStem} strokeWidth={1.1} fill="none" opacity={0.4} />
        {variant.leaves.map((leaf, i) => (
          <G key={i} transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}>
            <Path d={leafPath(leaf.cx, leaf.cy, leaf.rx, leaf.ry)} fill={Colors.leafFillA} opacity={0.3} />
          </G>
        ))}
        {variant.dots.map(([cx, cy, r], i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={Colors.leafGold} opacity={0.35} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // A fixed corner box: the sprig keeps its size whatever the card's width.
  wrap: { position: "absolute", bottom: 0, width: 90, height: 70 },
  right: { right: 0 },
  left: { left: 0, transform: [{ scaleX: -1 }] },
});
