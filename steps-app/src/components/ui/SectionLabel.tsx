import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  label: string;
  actionLabel?: string;
  onActionPress?: () => void;
  /**
   * Centres the label instead of aligning it to the leading edge.
   *
   * Opt-in, because every other section heading sits above a left-aligned
   * list where a centred one reads as detached from what it labels. Not
   * combinable with an action — a trailing link has nowhere to go.
   */
  centered?: boolean;
};

/** Section heading, with an optional action on the trailing edge. */
export default function SectionLabel({
  label,
  actionLabel,
  onActionPress,
  centered = false,
}: Props) {
  const { isRTL, rtlText } = useTranslation();

  return (
    <View style={[styles.row, isRTL && styles.rowReverse, centered && styles.rowCentered]}>
      <Text style={[styles.label, centered ? styles.labelCentered : rtlText]}>{label}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={12}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowCentered: { justifyContent: "center" },
  labelCentered: { textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Colors.bark,
  },
  action: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.terracotta,
  },
});
