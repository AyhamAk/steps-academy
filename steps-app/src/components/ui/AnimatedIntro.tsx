import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";

const HOLD_MS = 1400;
const FADE_OUT_MS = 320;

/**
 * Branded launch animation, shown once per cold start over the app while the
 * first screen mounts underneath. The native splash (a static image — the OS
 * renders it before any JS runs, so it can never animate) hands off to this.
 * Tapping anywhere skips it.
 */
export function AnimatedIntro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReduceMotionSetting();

  const overlayOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.78);
  const logoY = useSharedValue(16);
  const float = useSharedValue(0);

  // A full-screen overlay that fails to unmount would silently swallow every
  // touch in the app, so dismissal stops capturing input immediately and is
  // backed by a hard timeout rather than trusting the animation callback.
  const [isDismissing, setIsDismissing] = useState(false);
  const hasFinished = useRef(false);

  const finish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    onDone();
  }, [onDone]);

  const dismiss = useCallback(() => {
    setIsDismissing(true);
    overlayOpacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }, [finish]);

  useEffect(() => {
    if (!isDismissing) return;
    const failsafe = setTimeout(finish, FADE_OUT_MS + 250);
    return () => clearTimeout(failsafe);
  }, [isDismissing, finish]);

  useEffect(() => {
    if (reduceMotion) {
      logoOpacity.value = 1;
      logoScale.value = 1;
      logoY.value = 0;
      const timer = setTimeout(dismiss, 500);
      return () => clearTimeout(timer);
    }

    logoOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 11, stiffness: 95 });
    logoY.value = withSpring(0, { damping: 13, stiffness: 90 });
    // Gentle drift once it has settled, so the hold doesn't feel frozen.
    float.value = withDelay(
      620,
      withRepeat(withTiming(-7, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true)
    );

    const timer = setTimeout(dismiss, HOLD_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, dismiss]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoY.value + float.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      pointerEvents={isDismissing ? "none" : "auto"}
    >
      <Pressable style={styles.tapArea} onPress={dismiss}>
        <Animated.View style={logoStyle}>
          <Image
            source={require("../../assets/steps-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cream,
    zIndex: 100,
  },
  tapArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 260,
    height: 176,
  },
});
