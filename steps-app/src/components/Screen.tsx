import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "./ErrorBoundary";
import { useTranslation } from "../i18n/useTranslation";
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
  const { isRTL } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* The screen-level branch. It lives here, not in a header, because only
          here can it run off the screen's own top and side edges: everything
          below sits inside 24pt padding and a scroll view that clips.
          Always the physical top-left, in every language, as in the design
          reference: in Arabic that is opposite the greeting. Drawn first, so
          the greeting and all content paint over it. */}
      {decorated ? (
        <CornerLeafDecoration corner={isRTL ? "top-end" : "top-start"} size="xl" bleed={18} />
      ) : null}
      <View
        className="flex-1 px-6 pt-4"
        style={safeBottom ? { paddingBottom: insets.bottom } : undefined}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
