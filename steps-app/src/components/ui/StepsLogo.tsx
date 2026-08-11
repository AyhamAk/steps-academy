import { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
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

/**
 * The logo drifts, sways and breathes on a loop.
 *
 * Deliberately animated in code rather than shipped as a GIF: the artwork is
 * a 1524px PNG, so a GIF at that size would be heavy and visibly dithered
 * (GIF is limited to 256 colours), and reliable cross-platform GIF playback
 * would mean adding a native image library and rebuilding. This stays sharp
 * at any size and costs nothing.
 *
 * The three loops use different durations so they drift out of phase, which
 * reads as organic rather than mechanical.
 */
export function StepsLogo() {
  const reduceMotion = useReduceMotionSetting();

  const entrance = useSharedValue(reduceMotion ? 1 : 0.6);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const floatY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;

    entrance.value = withSpring(1, { damping: 11, stiffness: 110 });
    opacity.value = withTiming(1, { duration: 600 });

    // Rise and fall, like the balloon is carrying it.
    floatY.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-9, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    // A slow lean either side of upright.
    tilt.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2300, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // Barely-there scale change; enough to feel alive, not enough to notice.
    breathe.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1.025, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: floatY.value },
      { rotate: `${tilt.value * 1.6}deg` },
      { scale: entrance.value * breathe.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={require("../../assets/steps-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 220,
    height: 150,
    alignSelf: "center",
  },
});
