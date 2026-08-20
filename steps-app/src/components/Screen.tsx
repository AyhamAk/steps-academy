import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "./ErrorBoundary";

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
}>;

export function Screen({ children, safeBottom = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "left", "right"]}>
      <View
        className="flex-1 px-6 pt-4"
        style={safeBottom ? { paddingBottom: insets.bottom } : undefined}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
