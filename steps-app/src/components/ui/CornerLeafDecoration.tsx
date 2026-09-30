import { StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";

export type LeafCorner = "bottom-start" | "bottom-end" | "top-start" | "top-end";

const SIZES = {
  sm: { width: 56, height: 44 },
  md: { width: 90, height: 70 },
} as const;

/**
 * A sprig of leaves tucked into a card's corner: a curved stem, three soft
 * leaves, two gold dots.
 *
 * A flat vector stand-in for the hand-painted watercolour branches in the
 * design reference — it keeps the rhythm, not the fidelity. When real artwork
 * exists, swap the <Svg> below for an <Image>; every caller stays the same.
 *
 * "start" and "end" follow the reading direction, so a bottom-start sprig sits
 * bottom-left in English and bottom-right in Arabic, mirrored to face inward.
 * It never takes taps: the wrapper has pointerEvents="none".
 */
export function CornerLeafDecoration({
  corner = "bottom-start",
  size = "sm",
}: {
  corner?: LeafCorner;
  size?: keyof typeof SIZES;
}) {
  const { isRTL } = useTranslation();
  const dims = SIZES[size];

  const isBottom = corner.startsWith("bottom");
  const isStart = corner.endsWith("start");
  const isLeft = isStart ? !isRTL : isRTL;

  // The artwork is drawn for the bottom-left corner. Other corners flip it so
  // the stem always grows out of the card's edge, never into the content.
  const position: ViewStyle = {
    [isBottom ? "bottom" : "top"]: -4,
    [isLeft ? "left" : "right"]: -4,
    transform: [{ scaleX: isLeft ? 1 : -1 }, { scaleY: isBottom ? 1 : -1 }],
  };

  return (
    <View pointerEvents="none" style={[styles.wrap, dims, position]}>
      <Svg width={dims.width} height={dims.height} viewBox="0 0 60 45">
        <Path
          d="M0,45 Q20,35 15,15"
          stroke={Colors.leafStem}
          strokeWidth={2}
          fill="none"
          opacity={0.65}
        />
        <Ellipse
          cx={13}
          cy={22}
          rx={8}
          ry={4}
          fill={Colors.leafFillB}
          transform="rotate(30 13 22)"
          opacity={0.7}
        />
        <Ellipse
          cx={22}
          cy={12}
          rx={7}
          ry={3.5}
          fill={Colors.leafFillA}
          transform="rotate(-15 22 12)"
          opacity={0.7}
        />
        <Ellipse
          cx={8}
          cy={10}
          rx={6}
          ry={3}
          fill={Colors.leafFillC}
          transform="rotate(45 8 10)"
          opacity={0.65}
        />
        <Circle cx={35} cy={30} r={1.5} fill={Colors.leafGold} opacity={0.6} />
        <Circle cx={42} cy={22} r={1.2} fill={Colors.leafGold} opacity={0.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Drawn first and absolutely placed, so the card's own content paints over it.
  wrap: { position: "absolute", zIndex: 0 },
});
