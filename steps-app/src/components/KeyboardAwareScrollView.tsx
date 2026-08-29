import { useEffect, useRef } from "react";
import {
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  ScrollViewProps,
  View,
} from "react-native";

import { useKeyboardInset, useKeyboardReveal } from "../hooks/useKeyboardInset";

/**
 * A ScrollView that keeps the focused text field above the keyboard.
 *
 * See `useKeyboardInset` for why the measurement is done by hand rather than
 * with `KeyboardAvoidingView`.
 */
export function KeyboardAwareScrollView({
  children,
  onScroll,
  onTouchEnd,
  ...props
}: ScrollViewProps) {
  const { height: keyboardHeight, topY } = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);

  const keyboard = useKeyboardReveal(topY, (y) =>
    scrollRef.current?.scrollTo({ y, animated: true })
  );

  // Deliberately after the spacer has rendered: scrolling before it exists
  // would just get clamped to the old, shorter content.
  useEffect(() => {
    if (keyboardHeight === 0) {
      keyboard.forget();
      return;
    }
    const frame = requestAnimationFrame(keyboard.reveal);
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight]);

  return (
    <ScrollView
      {...props}
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        keyboard.onScroll(event);
        onScroll?.(event);
      }}
      onTouchEnd={(event: GestureResponderEvent) => {
        keyboard.onTouchEnd(event);
        onTouchEnd?.(event);
      }}
    >
      {children}
      {/* Room to scroll into, added as a spacer rather than as padding on the
          content container so it stacks with whatever padding the screen
          already sets rather than replacing it. */}
      <View style={{ height: keyboardHeight }} />
    </ScrollView>
  );
}
