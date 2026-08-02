import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBoundary } from "./ErrorBoundary";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-6 py-4">
        <ErrorBoundary>{children}</ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
