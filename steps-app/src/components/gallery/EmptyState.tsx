import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Type } from "../../constants/Typography";

type EmptyStateProps = {
  emoji?: string;
  title: string;
  subtitle?: string;
};

export function EmptyState({ emoji = "📷", title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
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
});
