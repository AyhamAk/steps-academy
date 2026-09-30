import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";

/**
 * A round count on a sage tint — "3 parents waiting" rows. Grows sideways for
 * two- and three-digit numbers instead of shrinking the text.
 */
export function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.primary },
});
