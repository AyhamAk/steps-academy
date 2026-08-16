import { StyleSheet, Text, View } from "react-native";

/**
 * Marks a photo as containing one of this parent's children.
 *
 * One badge, one corner, one size, everywhere it appears. A neutral scrim
 * rather than a coloured disc: it has to stay readable over an unknown photo
 * without competing with the picture it sits on.
 */
export default function ChildTag({ emoji = "🐘" }: { emoji?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: 6,
    end: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 13 },
});
