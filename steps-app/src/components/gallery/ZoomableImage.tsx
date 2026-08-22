import { useMemo, useRef } from "react";
import { Animated, Image, PanResponder, StyleSheet } from "react-native";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_MS = 280;

const distanceBetween = (touches: { pageX: number; pageY: number }[]) => {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

/**
 * One photo in the fullscreen viewer, with pinch-to-zoom.
 *
 * Zoom used to be a double tap that flipped resizeMode between contain and
 * cover — which crops rather than magnifies, so it could never show detail.
 * This is the gesture people know from Instagram and Photos: two fingers to
 * zoom, one to move around once zoomed, double tap as a shortcut.
 *
 * Built on PanResponder rather than react-native-gesture-handler on purpose.
 * gesture-handler is a native module, so adding it breaks every client whose
 * binary predates it and forces a rebuild on both platforms — which is not
 * possible on iOS here without a paid Apple account. PanResponder ships in
 * React Native itself, so this works in any existing build and can go out
 * over the air.
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
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Committed values, read at the start of the next gesture. Animated.Value
  // has no synchronous getter that is safe to rely on mid-gesture.
  const committed = useRef({ scale: 1, x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTapAt = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim a second finger immediately; a single finger only once there
        // is something to pan around, so the pager keeps its swipe at 1×.
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2 || committed.current.scale > 1,
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2 || committed.current.scale > 1,

        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length === 2) {
            pinchStartDistance.current = distanceBetween(touches);
            return;
          }
          panStart.current = { x: committed.current.x, y: committed.current.y };

          const now = Date.now();
          if (now - lastTapAt.current < DOUBLE_TAP_MS) {
            lastTapAt.current = 0;
            toggleDoubleTap();
          } else {
            lastTapAt.current = now;
          }
        },

        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches;

          if (touches.length === 2) {
            if (pinchStartDistance.current === 0) {
              pinchStartDistance.current = distanceBetween(touches);
              return;
            }
            const ratio = distanceBetween(touches) / pinchStartDistance.current;
            // Clamped both ways: under 1 the photo drifts out of its frame,
            // over 4 there is nothing left but pixels.
            const next = Math.min(Math.max(committed.current.scale * ratio, 0.8), MAX_SCALE);
            scale.setValue(next);
            return;
          }

          if (committed.current.scale <= 1) return;
          translateX.setValue(panStart.current.x + gesture.dx);
          translateY.setValue(panStart.current.y + gesture.dy);
        },

        onPanResponderRelease: (event, gesture) => {
          pinchStartDistance.current = 0;

          // @ts-expect-error _value is the only synchronous read available.
          const currentScale: number = scale._value ?? committed.current.scale;

          if (currentScale <= 1) {
            reset();
            return;
          }
          committed.current = {
            scale: currentScale,
            x: panStart.current.x + gesture.dx,
            y: panStart.current.y + gesture.dy,
          };
          onZoomChange(true);
        },

        onPanResponderTerminationRequest: () => false,
      }),
    []
  );

  function reset() {
    committed.current = { scale: 1, x: 0, y: 0 };
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    onZoomChange(false);
  }

  function toggleDoubleTap() {
    if (committed.current.scale > 1) {
      reset();
      return;
    }
    committed.current = { scale: DOUBLE_TAP_SCALE, x: 0, y: 0 };
    Animated.timing(scale, {
      toValue: DOUBLE_TAP_SCALE,
      duration: 180,
      useNativeDriver: true,
    }).start();
    onZoomChange(true);
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.frame,
        { width },
        { transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
});
