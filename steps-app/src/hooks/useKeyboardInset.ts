import { MutableRefObject, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  TextInput,
} from "react-native";

type KeyboardInset = {
  /** How much of the screen the keyboard covers, in points. 0 when closed. */
  height: number;
  /**
   * Screen Y of the keyboard's top edge, or null when it is closed.
   *
   * A ref rather than state on purpose: the callers that need this read it
   * inside gesture and layout callbacks, where a value captured at the last
   * render would be a frame behind the keyboard that just opened.
   */
  topY: MutableRefObject<number | null>;
};

/**
 * Measures the on-screen keyboard.
 *
 * Every form in the app needs this now that edge-to-edge is mandatory in Expo
 * SDK 54: the Android window no longer resizes when the keyboard opens, so the
 * `adjustResize` in the manifest does nothing and anything low on the screen
 * ends up underneath it.
 *
 * `KeyboardAvoidingView` is not the answer. It measures its own frame with
 * `onLayout`, which reports a position relative to its parent, then subtracts
 * that from a keyboard position given in screen coordinates — two different
 * coordinate spaces, so it under-pads by however far down the screen it starts.
 *
 * This reports the real numbers and lets each caller decide what to do with
 * them: a scrolling screen scrolls the focused field into view, a bottom sheet
 * simply pads itself upward.
 */
export function useKeyboardInset(): KeyboardInset {
  const [height, setHeight] = useState(0);
  const topY = useRef<number | null>(null);

  useEffect(() => {
    const isIOS = Platform.OS === "ios";

    const show = Keyboard.addListener(isIOS ? "keyboardWillShow" : "keyboardDidShow", (event) => {
      const { height: keyboardHeight, screenY } = event.endCoordinates;
      topY.current = screenY || Dimensions.get("window").height - keyboardHeight;
      setHeight(keyboardHeight);
    });

    const hide = Keyboard.addListener(isIOS ? "keyboardWillHide" : "keyboardDidHide", () => {
      topY.current = null;
      setHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { height, topY };
}

/** Breathing room left between the focused field and the top of the keyboard. */
const GAP = 16;

/**
 * Keeps the focused text field above the keyboard inside any scrollable.
 *
 * Takes a scroll function rather than a ref so it works for both `ScrollView`
 * (`scrollTo`) and `FlatList` (`scrollToOffset`), which do not share an API.
 * Spread the returned props onto the scrollable, and give it enough bottom
 * padding to scroll into — `useKeyboardInset().height` is that number.
 */
export function useKeyboardReveal(
  keyboardTop: MutableRefObject<number | null>,
  scrollToY: (y: number) => void
) {
  const offset = useRef(0);
  /**
   * The input the last scroll was performed for. Without this, the tap that
   * ends a manual scroll would drag the user straight back to the field they
   * were scrolling away from.
   */
  const revealedFor = useRef<unknown>(null);

  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top == null) return;

    revealedFor.current = input;
    input.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + GAP - top;
      if (overlap > 0) scrollToY(offset.current + overlap);
    });
  };

  const forget = () => {
    revealedFor.current = null;
  };

  return {
    reveal,
    forget,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    onTouchEnd: (_event: GestureResponderEvent) => {
      // Moving between fields keeps the keyboard up, so no keyboard event
      // fires. A tap is the only thing that moves focus, so re-check after
      // one — but only when focus actually landed somewhere new.
      setTimeout(() => {
        if (TextInput.State.currentlyFocusedInput() !== revealedFor.current) reveal();
      }, 50);
    },
  };
}
