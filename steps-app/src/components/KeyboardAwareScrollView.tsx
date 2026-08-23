import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  TextInput,
  View,
} from "react-native";

/** Breathing room left between the focused field and the top of the keyboard. */
const GAP = 16;

/**
 * A ScrollView that keeps the focused text field above the keyboard.
 *
 * Android needs this now that edge-to-edge is mandatory (SDK 54): the window no
 * longer resizes when the keyboard opens, so the `adjustResize` in the manifest
 * does nothing and any field low on the screen simply ends up underneath it.
 *
 * `KeyboardAvoidingView` doesn't rescue us either. It measures its own frame
 * with `onLayout`, which reports a position relative to its parent, then
 * subtracts that from a keyboard position given in screen coordinates. The two
 * numbers are in different spaces, so it under-pads by however far down the
 * screen it starts — which is exactly the case here, sitting under a safe-area
 * inset and a logo.
 *
 * So the arithmetic happens here instead, in one coordinate space: measure the
 * focused input in window coordinates, compare it against the keyboard's top
 * edge, and scroll by the difference.
 */
export function KeyboardAwareScrollView({
  children,
  onScroll,
  onTouchEnd,
  ...props
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  /**
   * The input the last scroll was performed for. Without this, the tap that
   * ends a manual scroll would drag the user straight back to the field they
   * were scrolling away from.
   */
  const revealedFor = useRef<unknown>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top == null) return;

    revealedFor.current = input;
    input.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + GAP - top;
      if (overlap <= 0) return;
      scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  };

  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const show = Keyboard.addListener(isIOS ? "keyboardWillShow" : "keyboardDidShow", (event) => {
      const { height, screenY } = event.endCoordinates;
      setKeyboardHeight(height);
      keyboardTop.current = screenY || Dimensions.get("window").height - height;
    });
    const hide = Keyboard.addListener(isIOS ? "keyboardWillHide" : "keyboardDidHide", () => {
      setKeyboardHeight(0);
      keyboardTop.current = null;
      revealedFor.current = null;
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Deliberately after the spacer has rendered: scrolling before it exists
  // would just get clamped to the old, shorter content.
  useEffect(() => {
    if (keyboardHeight === 0) return;
    const frame = requestAnimationFrame(reveal);
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight]);

  return (
    <ScrollView
      {...props}
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      onTouchEnd={(event) => {
        // Moving between fields keeps the keyboard up, so no keyboard event
        // fires. A tap is the only thing that moves focus, so re-check after
        // one — but only when focus actually landed somewhere new.
        setTimeout(() => {
          if (TextInput.State.currentlyFocusedInput() !== revealedFor.current) reveal();
        }, 50);
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
