import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";

const LOGO_WIDTH = 220;
const LOGO_HEIGHT = 150;

/**
 * The butterflies, lifted out of the artwork so they can move on their own.
 *
 * The logo shipped as one flat PNG, which can only ever be animated as a
 * single block. These were separated out by colour (they're the only
 * saturated blue in that corner of the image) and erased from the base, so
 * each one can now flutter independently over it. Positions are fractions of
 * the logo box, so they stay put at any size.
 *
 * Each has its own drift, rise and timing — matching numbers would read as a
 * single object sliding around rather than separate butterflies.
 */
const BUTTERFLIES = [
  {
    source: require("../../assets/logo-butterfly-1.png"),
    left: 0.6312, top: 0.1696, width: 0.1253, height: 0.2229,
    driftX: 7, driftY: -9, tilt: 9, duration: 2600, delay: 0,
  },
  {
    source: require("../../assets/logo-butterfly-2.png"),
    left: 0.9022, top: 0.3236, width: 0.0853, height: 0.0921,
    driftX: -6, driftY: -7, tilt: -11, duration: 3100, delay: 420,
  },
  {
    source: require("../../assets/logo-butterfly-3.png"),
    left: 0.7054, top: 0.0426, width: 0.0505, height: 0.0736,
    driftX: 5, driftY: 6, tilt: 13, duration: 2300, delay: 900,
  },
  {
    source: require("../../assets/logo-butterfly-4.png"),
    left: 0.9180, top: 0.0339, width: 0.0722, height: 0.1211,
    driftX: -5, driftY: 8, tilt: -8, duration: 2900, delay: 1300,
  },
  {
    source: require("../../assets/logo-butterfly-5.png"),
    left: 0.9803, top: 0.2364, width: 0.0151, height: 0.0223,
    driftX: 4, driftY: -5, tilt: 0, duration: 2100, delay: 700,
  },
] as const;

function Butterfly({
  config,
  reduceMotion,
}: {
  config: (typeof BUTTERFLIES)[number];
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * config.driftX },
      { translateY: progress.value * config.driftY },
      { rotate: `${progress.value * config.tilt}deg` },
    ],
  }));

  return (
    <Animated.Image
      source={config.source}
      resizeMode="contain"
      style={[
        styles.butterfly,
        {
          left: config.left * LOGO_WIDTH,
          top: config.top * LOGO_HEIGHT,
          width: config.width * LOGO_WIDTH,
          height: config.height * LOGO_HEIGHT,
        },
        style,
      ]}
    />
  );
}

/**
 * Height of the compact variant, used where the logo is a mark rather than the
 * main event — the admin home, where full size ate a third of the first screen.
 */
const COMPACT_HEIGHT = 110;

export function StepsLogo({
  compact = false,
  maxWidth,
}: {
  compact?: boolean;
  /** Caps the logo on small screens, where full size ate a third of the fold. */
  maxWidth?: number;
}) {
  const reduceMotion = useReduceMotionSetting();
  // Scaling the whole stage keeps the butterflies' fractional positions exact,
  // so the artwork never distorts — only its size changes.
  const widthScale = maxWidth ? Math.min(maxWidth / LOGO_WIDTH, 1) : 1;
  const scale = (compact ? COMPACT_HEIGHT / LOGO_HEIGHT : 1) * widthScale;

  const entrance = useSharedValue(reduceMotion ? 1 : 0.6);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    entrance.value = withSpring(1, { damping: 11, stiffness: 110 });
    opacity.value = withTiming(1, { duration: 600 });
    // The logo itself only drifts now — the life comes from the butterflies.
    floatY.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: floatY.value }, { scale: entrance.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { height: LOGO_HEIGHT * scale },
        containerStyle,
      ]}
    >
      <View style={[styles.stage, scale !== 1 && { transform: [{ scale }] }]}>
        <Image source={require("../../assets/logo-base.png")} style={styles.base} resizeMode="contain" />
        {BUTTERFLIES.map((config) => (
          <Butterfly key={config.source} config={config} reduceMotion={reduceMotion} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    justifyContent: "center",
  },
  stage: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  base: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  butterfly: {
    position: "absolute",
  },
});
