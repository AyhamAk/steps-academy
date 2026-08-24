import { useMemo, useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
} from "react-native";

const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** How far a finger may travel and still count as a tap rather than a drag. */
const TAP_SLOP = 12;

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

const midpoint = (touches: { pageX: number; pageY: number }[]): Point => ({
  x: (touches[0].pageX + touches[1].pageX) / 2,
  y: (touches[0].pageY + touches[1].pageY) / 2,
});

const distanceBetween = (touches: { pageX: number; pageY: number }[]) =>
  Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * One photo in the fullscreen viewer, with pinch-to-zoom.
 *
 * Built on PanResponder rather than react-native-gesture-handler on purpose.
 * gesture-handler is a native module, so adding it breaks every client whose
 * binary predates it and forces a rebuild on both platforms - which is not
 * possible on iOS here without a paid Apple account. PanResponder ships in
 * React Native itself, so this works in any existing build and can go out
 * over the air.
 *
 * The zoom is anchored to the point between the fingers rather than to the
 * centre of the frame. Centre-anchored zoom is what makes a viewer feel weak:
 * magnifying a face in the corner pushes it off screen, so you have to zoom,
 * drag it back, zoom again. Anchoring means whatever is under your fingers
 * stays under your fingers, which is how every phone photo app behaves.
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
  const committed = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  // Live values, updated every frame so a gesture that changes finger count
  // mid-flight can pick up exactly where the previous one left off.
  const live = useRef<Transform>({ scale: 1, x: 0, y: 0 });

  const frame = useRef({ width: 0, height: 0, pageX: 0, pageY: 0 });
  const gestureStart = useRef({ distance: 0, scale: 1, x: 0, y: 0, focal: { x: 0, y: 0 } });
  const touchStart = useRef({ x: 0, y: 0, moved: false, pinched: false });
  const lastTapAt = useRef(0);

  const setLive = (next: Transform) => {
    live.current = next;
    scale.setValue(next.scale);
    translateX.setValue(next.x);
    translateY.setValue(next.y);
  };

  /** Furthest the photo may be dragged before empty space shows on that edge. */
  const bounds = (atScale: number) => ({
    x: Math.max((frame.current.width * atScale - frame.current.width) / 2, 0),
    y: Math.max((frame.current.height * atScale - frame.current.height) / 2, 0),
  });

  const settle = (target: Transform) => {
    committed.current = target;
    live.current = target;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: target.scale,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.spring(translateX, {
        toValue: target.x,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.spring(translateY, {
        toValue: target.y,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
    ]).start();
    onZoomChange(target.scale > 1);
  };

  const reset = () => settle({ scale: 1, x: 0, y: 0 });

  /**
   * Rescale about a fixed screen point, keeping whatever sits under that point
   * exactly where it is. Derived from the point's position in the photo's own
   * coordinates, which must not change.
   */
  const scaleAbout = (focal: Point, from: Transform, to: number): Transform => {
    const dx = focal.x - frame.current.pageX - frame.current.width / 2;
    const dy = focal.y - frame.current.pageY - frame.current.height / 2;
    const ratio = to / from.scale;
    return {
      scale: to,
      x: dx - ratio * (dx - from.x),
      y: dy - ratio * (dy - from.y),
    };
  };

  const settleWithinBounds = (target: Transform) => {
    const limit = bounds(target.scale);
    settle({
      scale: target.scale,
      x: clamp(target.x, -limit.x, limit.x),
      y: clamp(target.y, -limit.y, limit.y),
    });
  };

  const zoomToPoint = (focal: Point) => {
    if (committed.current.scale > 1) {
      reset();
      return;
    }
    settleWithinBounds(scaleAbout(focal, committed.current, DOUBLE_TAP_SCALE));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim a second finger immediately; a single finger only once there
        // is something to pan around, so the pager keeps its swipe at 1x.
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2 || committed.current.scale > 1,
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2 || committed.current.scale > 1,

        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          const isPinch = touches.length === 2;
          gestureStart.current = {
            distance: isPinch ? distanceBetween(touches) : 0,
            scale: live.current.scale,
            x: live.current.x,
            y: live.current.y,
            focal: isPinch
              ? midpoint(touches)
              : { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY },
          };
        },

        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;

          if (touches.length === 2) {
            // A finger added mid-gesture starts its own pinch from here rather
            // than inheriting a distance that was measured with one finger.
            if (gestureStart.current.distance === 0) {
              gestureStart.current = {
                distance: distanceBetween(touches),
                scale: live.current.scale,
                x: live.current.x,
                y: live.current.y,
                focal: midpoint(touches),
              };
              return;
            }

            const start = gestureStart.current;
            const ratio = distanceBetween(touches) / start.distance;
            // Slightly under 1 is allowed: the give is what tells you you have
            // hit the bottom of the range rather than that the pinch is dead.
            const next = clamp(start.scale * ratio, 0.85, MAX_SCALE);
            const anchored = scaleAbout(start.focal, start, next);

            // Two fingers also drag - the midpoint moving is a pan.
            const focal = midpoint(touches);
            setLive({
              scale: next,
              x: anchored.x + (focal.x - start.focal.x),
              y: anchored.y + (focal.y - start.focal.y),
            });
            return;
          }

          const [touch] = touches;
          if (!touch || live.current.scale <= 1) return;
          setLive({
            scale: live.current.scale,
            x: gestureStart.current.x + (touch.pageX - gestureStart.current.focal.x),
            y: gestureStart.current.y + (touch.pageY - gestureStart.current.focal.y),
          });
        },

        onPanResponderRelease: () => {
          if (live.current.scale <= 1) {
            reset();
            return;
          }
          settleWithinBounds(live.current);
        },

        onPanResponderTerminationRequest: () => false,
      }),
    []
  );

  // Taps are read from raw touch events rather than from the PanResponder. At
  // 1x the responder deliberately never grants for a single finger, so a double
  // tap handled in `onPanResponderGrant` could only ever fire on a photo that
  // was already zoomed - that is, never when you actually need it.
  const handleTouchStart = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length > 1) {
      touchStart.current.pinched = true;
      // A second finger means a pinch is beginning. Take the pager out of the
      // running now, so it cannot read the spread as a sideways swipe and page
      // away mid-zoom.
      onZoomChange(true);
      return;
    }
    touchStart.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      moved: false,
      pinched: false,
    };
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    const start = touchStart.current;
    const travelled = Math.hypot(
      event.nativeEvent.pageX - start.x,
      event.nativeEvent.pageY - start.y
    );
    if (travelled > TAP_SLOP) start.moved = true;
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    const start = touchStart.current;
    const isLastFinger = event.nativeEvent.touches.length === 0;

    if (start.moved || start.pinched || !isLastFinger) {
      // The pager was stood down on the first extra finger; hand it back unless
      // the pinch actually left the photo zoomed in.
      if (start.pinched && isLastFinger) onZoomChange(committed.current.scale > 1);
      return;
    }

    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      zoomToPoint({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    } else {
      lastTapAt.current = now;
    }
  };

  // `pageX`/`pageY` stay at 0: the viewer is a fullscreen, status-bar-translucent
  // modal, and the pager scrolls whichever photo is being touched to the origin.
  // Measuring instead would be an async round trip that a gesture starting on
  // the same frame could easily outrun.
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    frame.current = { ...frame.current, width: w, height: h };
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={handleLayout}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={[styles.frame, { width }, { transform: [{ translateX }, { translateY }, { scale }] }]}
    >
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
});
