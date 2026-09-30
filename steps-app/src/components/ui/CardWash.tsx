import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * The quiet decoration inside a card: a pale watercolour-style wash in one
 * corner, a thin gold line sweeping across it, and a few gold dots.
 *
 * Three variants, so a grid of cards reads as different places rather than
 * one stamp repeated. Callers pass the card's index and each card picks its
 * own variant.
 *
 * Fills the card and sits under its content; the card must clip
 * (overflow: "hidden") and the wash never takes taps.
 */

type Variant = {
  /** The wash: a soft organic blob. */
  blob: string;
  blobColor: string;
  /** A second, smaller wash layered on the first for a painted feel. */
  blob2: string;
  blob2Color: string;
  /** The gold line. */
  line: string;
  dots: [number, number, number][];
};

// Drawn in a 100×80 box with the wash in the bottom-right; mirrored for RTL
// so the wash sits at the end side, as in the design reference.
const VARIANTS: Variant[] = [
  {
    blob: "M100,34 C84,36 70,48 66,62 C63,72 70,80 70,80 L100,80 Z",
    blobColor: Colors.leafFillC,
    blob2: "M100,52 C90,54 82,62 82,80 L100,80 Z",
    blob2Color: Colors.leafFillB,
    line: "M52,80 C60,66 74,56 100,50",
    dots: [
      [60, 58, 1.4],
      [55, 66, 1],
      [66, 50, 0.9],
    ],
  },
  {
    blob: "M100,46 C88,44 76,54 74,68 C73,74 76,80 76,80 L100,80 Z",
    blobColor: Colors.secondaryLight,
    blob2: "M100,60 C92,62 88,70 90,80 L100,80 Z",
    blob2Color: Colors.leafFillC,
    line: "M40,80 C56,74 70,60 86,40",
    dots: [
      [90, 34, 1.4],
      [82, 30, 1],
      [94, 42, 0.9],
      [46, 72, 1],
    ],
  },
  {
    blob: "M100,24 C86,30 80,42 84,56 C87,66 96,72 100,74 Z",
    blobColor: Colors.accent2Light,
    blob2: "M100,58 C94,62 92,72 96,80 L100,80 Z",
    blob2Color: Colors.leafFillC,
    line: "M62,80 C66,68 76,62 90,62 C95,62 98,60 100,58",
    dots: [
      [70, 60, 1.3],
      [64, 68, 1],
    ],
  },
  {
    // A low, wide wash along the bottom edge, with the line rising over it.
    blob: "M100,58 C80,58 64,66 56,80 L100,80 Z",
    blobColor: Colors.secondaryLight,
    blob2: "M100,66 C88,68 80,74 78,80 L100,80 Z",
    blob2Color: Colors.leafFillB,
    line: "M70,80 C74,70 82,56 98,46",
    dots: [
      [92, 40, 1.2],
      [86, 48, 0.9],
      [76, 62, 1.3],
    ],
  },
];

export function CardWash({ index = 0 }: { index?: number }) {
  const { isRTL } = useTranslation();
  const variant = VARIANTS[((index % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, isRTL && styles.mirrored]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="xMaxYMax slice">
        <Path d={variant.blob} fill={variant.blobColor} opacity={0.55} />
        <Path d={variant.blob2} fill={variant.blob2Color} opacity={0.4} />
        <Path d={variant.line} stroke={Colors.leafGold} strokeWidth={0.7} fill="none" opacity={0.7} />
        {variant.dots.map(([cx, cy, r], i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={Colors.leafGold} opacity={0.65} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
});
