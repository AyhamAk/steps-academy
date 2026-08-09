import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";

type Variant = "primary" | "secondary" | "outline";
type Size = "sm" | "md" | "lg";

type StepsButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
  /** One-time shimmer sweep across the button shortly after mount, to draw the eye to a key CTA. */
  shimmerOnMount?: boolean;
  /** Shows a spinner in place of the label and blocks repeat taps. */
  loading?: boolean;
  disabled?: boolean;
};

const SIZE_STYLES: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
};

type Ripple = { id: number; x: number; y: number; size: number; anim: Animated.Value };

export function StepsButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  style,
  shimmerOnMount = false,
  loading = false,
  disabled = false,
}: StepsButtonProps) {
  const reduceMotion = useReduceMotionSetting();
  const isInactive = loading || disabled;
  const scale = useRef(new Animated.Value(1)).current;
  const rippleId = useRef(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const mountShimmer = useRef(new Animated.Value(0)).current;
  const sizeStyle = SIZE_STYLES[size];

  useEffect(() => {
    if (!shimmerOnMount || reduceMotion || layout.width === 0) return;
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(mountShimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [shimmerOnMount, reduceMotion, layout.width]);

  const isOutline = variant === "outline";
  const backgroundColor = isOutline
    ? "transparent"
    : variant === "secondary"
      ? Colors.secondary
      : Colors.primary;
  const textColor = isOutline ? Colors.primary : "#FFFFFF";

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };

  const spawnRipple = (x: number, y: number) => {
    const id = rippleId.current++;
    const size = Math.max(layout.width, layout.height) * 2;
    const anim = new Animated.Value(0);
    setRipples((prev) => [...prev, { id, x, y, size, anim }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    if (isInactive) return;
    if (!reduceMotion) {
      spawnRipple(e.nativeEvent.locationX, e.nativeEvent.locationY);
    }
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLayout={handleLayout}
        disabled={isInactive}
        accessibilityState={{ disabled: isInactive, busy: loading }}
        style={[
          styles.base,
          {
            backgroundColor,
            paddingVertical: sizeStyle.paddingVertical,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderWidth: isOutline ? 1.5 : 0,
            borderColor: Colors.primary,
            shadowOpacity: isOutline ? 0 : 0.2,
          },
          isInactive && styles.inactive,
          style,
        ]}
      >
        <View style={styles.rippleClip} pointerEvents="none">
          {shimmerOnMount && !reduceMotion && layout.width > 0 ? (
            <Animated.View
              style={[
                styles.mountShimmer,
                {
                  transform: [
                    {
                      translateX: mountShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-layout.width * 0.6, layout.width * 1.8],
                      }),
                    },
                    { rotate: "20deg" },
                  ],
                  opacity: mountShimmer.interpolate({
                    inputRange: [0, 0.1, 0.9, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                },
              ]}
            />
          ) : null}
          {ripples.map((ripple) => (
            <Animated.View
              key={ripple.id}
              style={[
                styles.ripple,
                {
                  left: ripple.x - ripple.size / 2,
                  top: ripple.y - ripple.size / 2,
                  width: ripple.size,
                  height: ripple.size,
                  borderRadius: ripple.size / 2,
                  backgroundColor: isOutline ? Colors.primary : "#FFFFFF",
                  opacity: ripple.anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
                  transform: [
                    { scale: ripple.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>
        {loading ? (
          // Sized to the label's line height so the button doesn't resize mid-action.
          <View style={{ height: sizeStyle.fontSize * 1.25, justifyContent: "center" }}>
            <ActivityIndicator color={textColor} />
          </View>
        ) : (
          <Text style={{ color: textColor, fontSize: sizeStyle.fontSize, fontFamily: Fonts.bold }}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inactive: {
    opacity: 0.55,
  },
  rippleClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    overflow: "hidden",
  },
  ripple: {
    position: "absolute",
  },
  mountShimmer: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 24,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
});
