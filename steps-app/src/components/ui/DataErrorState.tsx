import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { StepsButton } from "./StepsButton";

type DataErrorStateProps = {
  /** Defaults to the shared "Something went wrong" copy. */
  title?: string;
  onRetry?: () => void;
  /** Inline sections sit inside a card, so they skip the tall centred padding. */
  compact?: boolean;
};

/**
 * Shown when a query fails, in place of a loading skeleton.
 *
 * Without this, a failed request leaves `data` undefined forever and the
 * skeleton shimmers for eternity — the screen looks like it's still working
 * when nothing is happening. An explicit dead end with a retry is honest, and
 * it's the difference between "slow" and "broken" for the person holding the
 * phone.
 */
export function DataErrorState({ title, onRetry, compact = false }: DataErrorStateProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>{title ?? t.common.somethingWentWrong}</Text>
      <Text style={styles.subtitle}>{t.common.tryAgain}</Text>
      {onRetry ? (
        <StepsButton
          label={t.common.retry}
          onPress={onRetry}
          variant="outline"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  compact: {
    paddingVertical: 24,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    ...Type.heading,
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...Type.caption,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 6,
  },
  button: {
    marginTop: 18,
    minWidth: 160,
  },
});
