import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { Type } from "../../constants/Typography";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";

const DOTS = [
  { color: Colors.terracotta, left: "22%" as const, delay: 0 },
  { color: Colors.forest, left: "72%" as const, delay: 500 },
  { color: Colors.sky, left: "50%" as const, delay: 1000 },
];

function FloatingDot({ color, left, delay, reduceMotion }: (typeof DOTS)[number] & { reduceMotion: boolean }) {
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    rise.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0 : 0.9 * (1 - rise.value),
    transform: [{ translateY: reduceMotion ? 0 : -34 * rise.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color, left }, animatedStyle]} />;
}

/** A bobbing balloon + rising dots, used as a branded loading state for the gallery. */
export function BalloonLoader({ label }: { label: string }) {
  const reduceMotion = useReduceMotionSetting();
  const bob = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  const balloonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : -10 * bob.value },
      { rotate: reduceMotion ? "0deg" : `${sway.value * 5}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.scene}>
        {DOTS.map((dot) => (
          <FloatingDot key={dot.left} {...dot} reduceMotion={reduceMotion} />
        ))}
        <Animated.View style={[styles.balloonGroup, balloonStyle]}>
          <View style={styles.balloon}>
            <View style={styles.highlight} />
          </View>
          <View style={styles.knot} />
          <View style={styles.string} />
        </Animated.View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
  },
  scene: {
    width: 120,
    height: 130,
    alignItems: "center",
  },
  balloonGroup: {
    alignItems: "center",
  },
  balloon: {
    width: 56,
    height: 68,
    borderRadius: 32,
    backgroundColor: Colors.honey,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  highlight: {
    width: 16,
    height: 22,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    opacity: 0.45,
    marginTop: 8,
    marginStart: 10,
  },
  knot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.honey,
    transform: [{ rotate: "45deg" }],
    marginTop: -4,
  },
  string: {
    width: 1.5,
    height: 36,
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 14,
  },
});
