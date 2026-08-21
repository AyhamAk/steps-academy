import { Image, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;

/**
 * One photo in the fullscreen viewer, with pinch-to-zoom.
 *
 * Zoom used to be a double tap that flipped resizeMode between contain and
 * cover — which crops rather than magnifies, so it could never show detail.
 * This is the gesture people already know from Instagram and Photos: two
 * fingers to zoom, one to move around once zoomed, and a double tap as a
 * shortcut.
 *
 * While zoomed, the pan gesture has to win over the pager underneath it or
 * dragging the photo would swipe to the next one instead. Back at 1× the
 * pager takes over again, so swiping between photos still works.
 */
export function ZoomableImage({
  uri,
  width,
  onZoomChange,
}: {
  uri: string;
  width: number;
  /** Lets the viewer lock its pager while a photo is zoomed in. */
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(onZoomChange)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      // Clamped at both ends: below 1 the photo would float away from the
      // frame, and past 4 it is only pixels.
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      runOnJS(onZoomChange)(true);
    });

  const pan = Gesture.Pan()
    // Two fingers means the pinch is still in charge; one finger only pans
    // once there is something to pan around.
    .minPointers(1)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(onZoomChange)(true);
    });

  // Pinch and pan run together so a two-finger gesture can zoom and reposition
  // at once; the double tap is exclusive so it cannot fire mid-pinch.
  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.frame, { width }, animatedStyle]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
});
