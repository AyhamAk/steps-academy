import { PropsWithChildren, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";

export type CardElevation = "featured" | "regular" | "flat";

type StepsCardProps = PropsWithChildren<{
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: CardElevation;
}>;

// Depth hierarchy: featured cards (hero, dashboard) sit higher; regular content
// cards are the default; flat cards read as secondary (border only, no shadow).
const SHADOWS: Record<
  CardElevation,
  { restOpacity: number; pressOpacity: number; restRadius: number; pressRadius: number; restElev: number; pressElev: number }
> = {
  featured: { restOpacity: 0.14, pressOpacity: 0.22, restRadius: 16, pressRadius: 22, restElev: 6, pressElev: 10 },
  regular: { restOpacity: 0.06, pressOpacity: 0.18, restRadius: 10, pressRadius: 18, restElev: 2, pressElev: 8 },
  flat: { restOpacity: 0, pressOpacity: 0, restRadius: 0, pressRadius: 0, restElev: 0, pressElev: 0 },
};

export function StepsCard({ children, style, onPress, elevation = "regular" }: StepsCardProps) {
  const lift = useRef(new Animated.Value(0)).current;
  const shadow = SHADOWS[elevation];

  const restShadow: ViewStyle = {
    shadowOpacity: shadow.restOpacity,
    shadowRadius: shadow.restRadius,
    elevation: shadow.restElev,
  };

  if (!onPress) {
    return <View style={[styles.card, restShadow, style]}>{children}</View>;
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
      <Animated.View style={[styles.card, animatedCardStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
  },
});
