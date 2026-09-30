import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";
import { Touchable } from "../ui/Touchable";

/**
 * Back arrow and one segment per sign-up step, filled up to the current one.
 * Replaces the plain "Step 2 of 4" line: a parent can see how much is left
 * without reading anything.
 */
export function StepProgressHeader({
  totalSteps,
  currentStep,
  onBack,
}: {
  totalSteps: number;
  /** 1-indexed. */
  currentStep: number;
  onBack: () => void;
}) {
  const { t, isRTL } = useTranslation();

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <Touchable onPress={onBack} accessibilityLabel={t.common.back} style={styles.back}>
        <Ionicons
          name={isRTL ? "arrow-forward" : "arrow-back"}
          size={22}
          color={Colors.terracotta}
        />
      </Touchable>
      <View
        style={[styles.segments, isRTL && styles.rowReverse]}
        accessibilityLabel={t.invite.stepOf(currentStep, totalSteps)}
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, index < currentStep && styles.segmentFilled]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rowReverse: { flexDirection: "row-reverse" },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  segments: { flexDirection: "row", gap: 5 },
  segment: { width: 18, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  segmentFilled: { backgroundColor: Colors.terracotta },
});
