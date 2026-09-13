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
import { Butterfly, BUTTERFLIES, BUTTERFLY_BOX } from "./StepsLogo";

/** Natural size of the artwork every fraction below is measured against. */
const LOGO_WIDTH = 1524;
const LOGO_HEIGHT = 1032;

/**
 * S · T · E · P · S, each its own layer.
 *
 * The wordmark shipped as one flat image, so the letters could only ever move
 * as a block. They were separated out of that image by colour — each letter is
 * a distinct hue and forms its own connected region — and written to five
 * crops plus a remainder holding the ACADEMY bar, elephant and balloon.
 * Recomposing the six pieces reproduces the original pixel for pixel: nothing
 * was redrawn, recoloured or resized, only cut apart.
 *
 * Positions are fractions of the logo box, so the word stays kerned exactly as
 * drawn at any size.
 */
const LETTERS = [
  { source: require("../../assets/logo-letter-1.png"), left: 0.0525, top: 0.3256, width: 0.1463, height: 0.4448 },
  { source: require("../../assets/logo-letter-2.png"), left: 0.1765, top: 0.3256, width: 0.1627, height: 0.4419 },
  { source: require("../../assets/logo-letter-3.png"), left: 0.332, top: 0.3266, width: 0.1273, height: 0.4351 },
  { source: require("../../assets/logo-letter-4.png"), left: 0.4718, top: 0.3227, width: 0.1247, height: 0.4457 },
  { source: require("../../assets/logo-letter-5.png"), left: 0.5722, top: 0.3246, width: 0.145, height: 0.4457 },
] as const;

/** Each letter lands 110ms after the one before it. */
const STAGGER_MS = 110;
/** How far above its resting place a letter starts, in logo-box units. */
const DROP_FROM = -0.16;

function Letter({
  config,
  index,
  scale,
  reduceMotion,
}: {
  config: (typeof LETTERS)[number];
  index: number;
  scale: number;
  reduceMotion: boolean;
}) {
  const drop = useSharedValue(reduceMotion ? 0 : DROP_FROM * LOGO_HEIGHT * scale);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const squash = useSharedValue(1);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const delay = index * STAGGER_MS;

    opacity.value = withDelay(delay, withTiming(1, { duration: 160 }));
    // Low damping so it overshoots and settles — the letter lands rather than
    // slides into place.
    drop.value = withDelay(delay, withSpring(0, { damping: 8, stiffness: 190 }));
    // A squash on impact, timed to arrive with the letter, then released.
    squash.value = withDelay(
      delay + 190,
      withSequence(
        withTiming(0.88, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 6, stiffness: 240 })
      )
    );

    // Once all five have landed, they take turns hopping — a footstep down the
    // word, which is what the academy is named after.
    hop.value = withDelay(
      LETTERS.length * STAGGER_MS + 700 + index * 130,
      withRepeat(
        withSequence(
          withTiming(-0.045 * LOGO_HEIGHT * scale, {
            duration: 260,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(0, { damping: 7, stiffness: 220 }),
          // The rest of the cycle is the wait for its turn to come round.
          withTiming(0, { duration: LETTERS.length * 130 + 900 })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion, index, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: drop.value + hop.value },
      { scaleY: squash.value },
      // Widen as it squashes, so the letter keeps its volume instead of just
      // getting shorter.
      { scaleX: 2 - squash.value },
    ],
  }));

  return (
    <Animated.Image
      source={config.source}
      resizeMode="contain"
      style={[
        styles.layer,
        {
          left: config.left * LOGO_WIDTH * scale,
          top: config.top * LOGO_HEIGHT * scale,
          width: config.width * LOGO_WIDTH * scale,
          height: config.height * LOGO_HEIGHT * scale,
        },
        style,
      ]}
    />
  );
}

/**
 * The full mark with the letters animating one at a time.
 *
 * Used by the launch screen only — everywhere else the logo is a still image
 * and should stay one.
 */
export function AnimatedLogoLetters({ maxWidth }: { maxWidth: number }) {
  const reduceMotion = useReduceMotionSetting();
  const scale = Math.min(maxWidth / LOGO_WIDTH, 1);
  const renderedWidth = LOGO_WIDTH * scale;
  // The butterflies' fractions are measured against StepsLogo's own display
  // box, not the artwork's true pixels, so they need their own multiplier.
  // Passing this component's scale straight through made them a seventh of
  // their size, huddled up in the corner above the S.
  const butterflyScale = renderedWidth / BUTTERFLY_BOX.width;

  const restOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // In just after the third letter, rather than waiting for all five. The
    // butterflies are small and the launch screen is short, so arriving late
    // left them barely a second on screen — long enough to render, not long
    // enough to notice.
    restOpacity.value = withDelay(
      2 * STAGGER_MS,
      withTiming(1, { duration: 340, easing: Easing.out(Easing.ease) })
    );
  }, [reduceMotion]);

  const restStyle = useAnimatedStyle(() => ({ opacity: restOpacity.value }));

  return (
    <View
      style={[styles.stage, { width: LOGO_WIDTH * scale, height: LOGO_HEIGHT * scale }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, restStyle]}>
        <Image
          source={require("../../assets/logo-rest.png")}
          resizeMode="contain"
          style={{ width: LOGO_WIDTH * scale, height: LOGO_HEIGHT * scale }}
        />
      </Animated.View>

      {LETTERS.map((config, index) => (
        <Letter
          key={config.left}
          config={config}
          index={index}
          scale={scale}
          reduceMotion={reduceMotion}
        />
      ))}

      {/* Fluttering over the balloon, as they do everywhere else the logo
          appears. They arrive with the elephant rather than with the letters,
          so the word lands against a still background. */}
      <Animated.View style={[StyleSheet.absoluteFill, restStyle]} pointerEvents="none">
        {BUTTERFLIES.map((config) => (
          <Butterfly
            key={config.source}
            config={config}
            reduceMotion={reduceMotion}
            scale={butterflyScale}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative" },
  layer: { position: "absolute" },
});
