import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { AnimatedLogoLetters } from "./AnimatedLogoLetters";

// Five staggered letters, then a hop each, then a beat to watch the
// butterflies drift before the hand-off.
const HOLD_MS = 3000;
const FADE_OUT_MS = 320;

/**
 * Branded launch animation, shown once per cold start over the app while the
 * first screen mounts underneath. The native splash (a static image — the OS
 * renders it before any JS runs, so it can never animate) hands off to this.
 * Tapping anywhere skips it.
 *
 * Worth knowing: by the time this mounts the app is already usable. RootLayout
 * renders nothing until fonts and both stores have hydrated, so this is not
 * covering a wait — it is a held beat in front of a ready app, which is why it
 * is short and skippable rather than looped indefinitely.
 *
 * Uses the layered StepsLogo rather than the flattened PNG, so the butterflies
 * drift on their own while the mark settles. Same artwork either way; no image
 * file is added, replaced or edited.
 */
export function AnimatedIntro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReduceMotionSetting();

  const overlayOpacity = useSharedValue(1);
  // The letters animate themselves; this wrapper only handles the hold and
  // the hand-off, so it must not add a competing scale or bounce.
  const exitScale = useSharedValue(1);

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
    // A touch of scale-up on the way out reads as the logo handing over to the
    // screen behind it, rather than the overlay simply vanishing.
    exitScale.value = withTiming(1.06, { duration: FADE_OUT_MS });
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
    // Long enough for five staggered letters to land and take one hop each.
    const timer = setTimeout(dismiss, reduceMotion ? 500 : HOLD_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, dismiss]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: exitScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      pointerEvents={isDismissing ? "none" : "auto"}
    >
      <Pressable style={styles.tapArea} onPress={dismiss}>
        <Animated.View style={logoStyle}>
          <AnimatedLogoLetters maxWidth={300} />
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
});
