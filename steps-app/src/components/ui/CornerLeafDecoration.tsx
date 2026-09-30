import { StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";

export type LeafCorner = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** sm: small cards · md: large cards and banners · lg: screen headers. */
const SIZES = {
  sm: { width: 64, height: 50 },
  md: { width: 90, height: 70 },
  lg: { width: 150, height: 115 },
} as const;

/**
 * A leafy branch tucked into a corner: a curved stem, five leaves along it and
 * a trail of gold dots.
 *
 * A flat vector stand-in for the hand-painted watercolour branches in the
 * design reference. Real artwork can replace the <Svg> later with an <Image>;
 * every caller stays the same.
 *
 * "start" and "end" follow the reading direction. The reference is an Arabic
 * screen with its branches on the left — the *end* side in Arabic, opposite
 * where text begins — so callers use the end corners to keep leaves out from
 * under titles in every language. The artwork is drawn growing out of the
 * bottom-left and flips to face inward from any other corner.
 *
 * Never takes taps: the wrapper is pointerEvents="none".
 */
export function CornerLeafDecoration({
  corner = "bottom-end",
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

  const position: ViewStyle = {
    [isBottom ? "bottom" : "top"]: -6,
    [isLeft ? "left" : "right"]: -6,
    transform: [{ scaleX: isLeft ? 1 : -1 }, { scaleY: isBottom ? 1 : -1 }],
  };

  return (
    <View pointerEvents="none" style={[styles.wrap, dims, position]}>
      <Svg width={dims.width} height={dims.height} viewBox="0 0 100 78">
        {/* the stem */}
        <Path
          d="M2,78 Q35,60 28,30 Q24,10 45,4"
          stroke={Colors.leafStem}
          strokeWidth={2.5}
          fill="none"
          opacity={0.6}
        />
        {/* leaves along it */}
        <Ellipse cx={26} cy={22} rx={16} ry={8} fill={Colors.leafFillA} transform="rotate(-25 26 22)" opacity={0.75} />
        <Ellipse cx={38} cy={35} rx={15} ry={7.5} fill={Colors.leafFillB} transform="rotate(15 38 35)" opacity={0.7} />
        <Ellipse cx={22} cy={48} rx={13} ry={6.5} fill={Colors.leafFillC} transform="rotate(-10 22 48)" opacity={0.7} />
        <Ellipse cx={12} cy={62} rx={11} ry={5.5} fill={Colors.leafFillA} transform="rotate(20 12 62)" opacity={0.65} />
        <Ellipse cx={48} cy={12} rx={10} ry={5} fill={Colors.leafFillB} transform="rotate(-30 48 12)" opacity={0.7} />
        {/* gold dots trailing off to the side */}
        <Circle cx={62} cy={20} r={2.5} fill={Colors.leafGold} opacity={0.6} />
        <Circle cx={72} cy={28} r={1.8} fill={Colors.leafGold} opacity={0.5} />
        <Circle cx={58} cy={34} r={1.8} fill={Colors.leafGold} opacity={0.5} />
        <Circle cx={68} cy={12} r={1.3} fill={Colors.leafGold} opacity={0.45} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Absolutely placed and drawn first, so the card's own content paints over it.
  wrap: { position: "absolute", zIndex: 0 },
});
