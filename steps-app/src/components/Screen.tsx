import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBoundary } from "./ErrorBoundary";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "left", "right"]}>
      <View className="flex-1 px-6 pt-4">
        <ErrorBoundary>{children}</ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
