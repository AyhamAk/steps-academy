import { PropsWithChildren } from "react";
import { Insets, StyleProp, TouchableOpacity, ViewStyle } from "react-native";

type TouchableProps = PropsWithChildren<{
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number | Insets;
  accessibilityLabel?: string;
}>;

/**
 * The app's standard tappable surface.
 *
 * Deliberately TouchableOpacity rather than Pressable: on this build a
 * Pressable with `style={({ pressed }) => ...}` renders its children but drops
 * the resolved background and layout, which is what made several controls
 * look like bare text and swallow taps. TouchableOpacity applies its press
 * feedback internally, so styles stay a plain array and every tappable thing
 * dims consistently.
 */
export function Touchable({
  onPress,
  onLongPress,
  disabled = false,
  style,
  hitSlop,
  accessibilityLabel,
  children,
}: TouchableProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={
        typeof hitSlop === "number"
          ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
          : hitSlop
      }
      style={[style, disabled && { opacity: 0.5 }]}
    >
      {children}
    </TouchableOpacity>
  );
}
