import { StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";

export type LeafCorner = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/**
 * sm: small cards · md: large cards and banners · xl: the screen corner.
 * All share the 120×90 drawing, so the branch keeps its shape at every size.
 */
const SIZES = {
  sm: { width: 80, height: 60 },
  md: { width: 112, height: 84 },
  xl: { width: 200, height: 150 },
} as const;

/** An almond with pointed tips, centred on (cx, cy): reads as a leaf where an ellipse reads as a pebble. */
export function leafPath(cx: number, cy: number, rx: number, ry: number): string {
  const bulge = ry * 1.35;
  return `M${cx - rx},${cy} Q${cx},${cy - bulge} ${cx + rx},${cy} Q${cx},${cy + bulge} ${cx - rx},${cy} Z`;
}

type Leaf = { cx: number; cy: number; rx: number; ry: number; rotate: number; fill: string };

const LEAVES: Leaf[] = [
  { cx: 30, cy: 24, rx: 23, ry: 11, rotate: -25, fill: Colors.leafFillA },
  { cx: 47, cy: 41, rx: 21, ry: 10, rotate: 15, fill: Colors.leafFillB },
  { cx: 24, cy: 57, rx: 19, ry: 9, rotate: -12, fill: Colors.leafFillA },
  { cx: 13, cy: 75, rx: 16, ry: 8, rotate: 22, fill: Colors.leafFillB },
  { cx: 59, cy: 12, rx: 15, ry: 7, rotate: -30, fill: Colors.leafFillB },
  { cx: 66, cy: 44, rx: 14, ry: 6.5, rotate: 28, fill: Colors.leafFillA },
];

/** A few small gold flecks, clustered by the upper leaf tips. */
const DOTS: [number, number, number][] = [
  [76, 7, 1.4],
  [81, 15, 0.9],
  [70, 2, 0.9],
  [82, 38, 1],
];

/**
 * A leafy branch tucked into a corner: a curved stem with a side twig, six
 * two-tone leaves and a few gold flecks, all kept pale so the branch sits
 * quietly behind the content.
 *
 * A flat vector stand-in for the hand-painted watercolour branches in the
 * design reference. The two tones suggest shading; real watercolour depth
 * needs a painted asset, which can replace the <Svg> without touching callers.
 *
 * "start" and "end" follow the reading direction. The drawing grows out of
 * the bottom-left and flips to face inward from any other corner. `bleed`
 * pulls it past the corner, so the branch runs off the edges instead of
 * sitting neatly inside them.
 *
 * Never takes taps: the wrapper is pointerEvents="none".
 */
export function CornerLeafDecoration({
  corner = "bottom-end",
  size = "sm",
  bleed = 6,
}: {
  corner?: LeafCorner;
  size?: keyof typeof SIZES;
  bleed?: number;
}) {
  const { isRTL } = useTranslation();
  const dims = SIZES[size];

  const isBottom = corner.startsWith("bottom");
  const isStart = corner.endsWith("start");
  const isLeft = isStart ? !isRTL : isRTL;

  const position: ViewStyle = {
    [isBottom ? "bottom" : "top"]: -bleed,
    [isLeft ? "left" : "right"]: -bleed,
    transform: [{ scaleX: isLeft ? 1 : -1 }, { scaleY: isBottom ? 1 : -1 }],
  };

  return (
    <View pointerEvents="none" style={[styles.wrap, dims, position]}>
      <Svg width={dims.width} height={dims.height} viewBox="0 0 120 90">
        {/* stem and side twig */}
        <Path
          d="M2,90 Q40,70 32,36 Q28,12 56,4"
          stroke={Colors.leafStem}
          strokeWidth={1.8}
          fill="none"
          opacity={0.4}
        />
        <Path d="M31,50 Q50,49 64,42" stroke={Colors.leafStem} strokeWidth={1.2} fill="none" opacity={0.35} />

        {LEAVES.map((leaf, index) => (
          <G key={index} transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}>
            <Path d={leafPath(leaf.cx, leaf.cy, leaf.rx, leaf.ry)} fill={leaf.fill} opacity={0.32} />
            {/* the lit upper half of the leaf */}
            <Path
              d={leafPath(leaf.cx - leaf.rx * 0.08, leaf.cy - leaf.ry * 0.32, leaf.rx * 0.7, leaf.ry * 0.42)}
              fill={Colors.leafFillC}
              opacity={0.3}
            />
            {/* midrib */}
            <Path
              d={`M${leaf.cx - leaf.rx * 0.85},${leaf.cy} L${leaf.cx + leaf.rx * 0.85},${leaf.cy}`}
              stroke={Colors.leafStem}
              strokeWidth={0.7}
              opacity={0.25}
            />
          </G>
        ))}

        {DOTS.map(([cx, cy, r], index) => (
          <Circle key={index} cx={cx} cy={cy} r={r} fill={Colors.leafGold} opacity={0.35} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Absolutely placed and drawn first, so the content around it paints over it.
  wrap: { position: "absolute", zIndex: 0 },
});
