import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import { Touchable } from "./ui/Touchable";

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐘</Text>
      <Text style={styles.title}>{t.common.somethingWentWrong}</Text>
      <Text style={styles.message}>{t.common.screenErrorMessage}</Text>
      <Touchable
        onPress={onRetry}
        style={[styles.button]}
      >
        <Text style={styles.buttonText}>{t.common.retry}</Text>
      </Touchable>
    </View>
  );
}

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Contains render/runtime errors so one crashing screen doesn't take down the
 * whole app. Wrapped around every screen via the shared `Screen` component.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Surfaced in Metro logs; a real build would forward this to Sentry.
    console.error("ErrorBoundary caught:", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.bark,
    textAlign: "center",
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  button: {
    borderWidth: 1.5,
    borderColor: Colors.terracotta,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.terracotta,
  },
});
