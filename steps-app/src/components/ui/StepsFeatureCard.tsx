import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { Fonts } from "../../constants/Fonts";

type StepsFeatureCardProps = {
  emoji: string;
  label: string;
  gradientColors: [string, string];
  shadowColor: string;
  delay: number;
  onPress: () => void;
};

export function StepsFeatureCard({
  emoji,
  label,
  gradientColors,
  shadowColor,
  delay,
  onPress,
}: StepsFeatureCardProps) {
  const reduceMotion = useReduceMotionSetting();
  const entranceOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const entranceScale = useSharedValue(reduceMotion ? 1 : 0.85);
  const pressScale = useSharedValue(1);
  const shimmerX = useSharedValue(-80);
  const shimmerOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    entranceOpacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    entranceScale.value = withDelay(delay, withSpring(1, { damping: 12 }));

    shimmerOpacity.value = withDelay(delay + 300, withTiming(1, { duration: 100 }));
    shimmerX.value = withDelay(
      delay + 300,
      withTiming(160, { duration: 500 }, () => {
        shimmerOpacity.value = withTiming(0, { duration: 150 });
      })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value * pressScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
    transform: [{ translateX: shimmerX.value }, { rotate: "20deg" }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withSpring(0.95);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1);
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { shadowColor }]}
        >
          <View style={styles.innerGlow} />
          {!reduceMotion ? <Animated.View style={[styles.shimmerStripe, shimmerStyle]} /> : null}
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "47%",
    aspectRatio: 1,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  innerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "#FFFFFF",
    opacity: 0.15,
  },
  shimmerStripe: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: 30,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  emoji: {
    fontSize: 38,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
});
