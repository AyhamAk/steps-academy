import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  value: number | string;
  label: string;
  valueColor?: string;
};

export default function StatTile({ value, label, valueColor }: Props) {
  const { rtlText } = useTranslation();

  return (
    <View style={styles.tile}>
      <Text style={[styles.value, rtlText, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={[styles.label, rtlText]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  value: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Fonts.extraBold,
    color: Colors.bark,
  },
  label: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Colors.textLight,
  },
});
