import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "./ErrorBoundary";
import { CornerLeafDecoration } from "./ui/CornerLeafDecoration";

type ScreenProps = PropsWithChildren<{
  /**
   * Reserve room for the Android navigation bar at the bottom.
   *
   * Off by default because the tab screens already clear it through the tab
   * bar's own height — turning it on there would pad twice. Stack routes have
   * no tab bar, so they need it or their last row sits under the system
   * buttons.
   */
  safeBottom?: boolean;
  /** The leaf branch in the top corner. On for every screen unless turned off. */
  decorated?: boolean;
}>;

export function Screen({ children, safeBottom = false, decorated = true }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* The screen-level branch. It lives here, not in a header, because only
          here can it run off the screen's own top and side edges: everything
          below sits inside 24pt padding and a scroll view that clips.
          Top-start is the corner opposite the bell and the header actions, and
          it is drawn first, so the greeting and all content paint over it. */}
      {decorated ? <CornerLeafDecoration corner="top-start" size="xl" bleed={18} /> : null}
      <View
        className="flex-1 px-6 pt-4"
        style={safeBottom ? { paddingBottom: insets.bottom } : undefined}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
