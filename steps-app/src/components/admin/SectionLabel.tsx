import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  label: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

/** Section heading, with an optional action on the trailing edge. */
export default function SectionLabel({ label, actionLabel, onActionPress }: Props) {
  const { isRTL, rtlText } = useTranslation();

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <Text style={[styles.label, rtlText]}>{label}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={12}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
