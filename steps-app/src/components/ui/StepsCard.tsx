import { PropsWithChildren, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";
import { CornerLeafDecoration } from "./CornerLeafDecoration";

export type CardElevation = "featured" | "regular" | "flat";

type StepsCardProps = PropsWithChildren<{
  style?: ViewStyle;
  onPress?: () => void;
  /** Kept for callers; the sage & gold style has no card shadows at all. */
  elevation?: CardElevation;
  /** A leaf sprig in the bottom-end corner, away from where text starts. Off for dense lists and small rows. */
  decorated?: boolean;
}>;

// Cards are a soft tint with no border and no shadow. The table stays so the
// press lift still animates translateY without every caller changing.
const SHADOWS: Record<
  CardElevation,
  { restOpacity: number; pressOpacity: number; restRadius: number; pressRadius: number; restElev: number; pressElev: number }
> = {
  featured: { restOpacity: 0, pressOpacity: 0, restRadius: 0, pressRadius: 0, restElev: 0, pressElev: 0 },
  regular: { restOpacity: 0, pressOpacity: 0, restRadius: 0, pressRadius: 0, restElev: 0, pressElev: 0 },
  flat: { restOpacity: 0, pressOpacity: 0, restRadius: 0, pressRadius: 0, restElev: 0, pressElev: 0 },
};

export function StepsCard({
  children,
  style,
  onPress,
  elevation = "regular",
  decorated = true,
}: StepsCardProps) {
  const leaves = decorated ? <CornerLeafDecoration corner="bottom-end" size="sm" /> : null;
  const lift = useRef(new Animated.Value(0)).current;
  const shadow = SHADOWS[elevation];

  const restShadow: ViewStyle = {
    shadowOpacity: shadow.restOpacity,
    shadowRadius: shadow.restRadius,
    elevation: shadow.restElev,
  };

  if (!onPress) {
    return (
      <View style={[styles.card, restShadow, style]}>
        {leaves}
        {children}
      </View>
    );
  }

  const animateTo = (toValue: number) => {
    Animated.timing(lift, { toValue, duration: 150, useNativeDriver: false }).start();
  };

  const animatedCardStyle = {
    shadowOpacity: lift.interpolate({ inputRange: [0, 1], outputRange: [shadow.restOpacity, shadow.pressOpacity] }),
    shadowRadius: lift.interpolate({ inputRange: [0, 1], outputRange: [shadow.restRadius, shadow.pressRadius] }),
    elevation: lift.interpolate({ inputRange: [0, 1], outputRange: [shadow.restElev, shadow.pressElev] }),
    transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
  };

  return (
    <Pressable onPress={onPress} onPressIn={() => animateTo(1)} onPressOut={() => animateTo(0)}>
      <Animated.View style={[styles.card, animatedCardStyle, style]}>
        {leaves}
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    // The sprig tucks into the corner rather than spilling past the radius.
    overflow: "hidden",
  },
});
