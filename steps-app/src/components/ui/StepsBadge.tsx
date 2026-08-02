import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";

type StepsBadgeProps = {
  label: string;
  color?: string;
};

export function StepsBadge({ label, color = Colors.primary }: StepsBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 50,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
});
