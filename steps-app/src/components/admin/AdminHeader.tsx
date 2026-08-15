import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  title: string;
  subtitle?: string;
};

/**
 * One header for every admin sub-screen. The back arrow sits on the title's
 * centre line rather than below its baseline, and inside a 44x44 target.
 */
export default function AdminHeader({ title, subtitle }: Props) {
  const router = useRouter();
  const { isRTL, rtlText, t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, isRTL && styles.rowReverse]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, isRTL ? styles.backBtnRTL : styles.backBtnLTR]}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <Text style={styles.backArrow}>{isRTL ? "→" : "←"}</Text>
        </Pressable>
        <Text style={[styles.title, rtlText]} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, isRTL ? styles.subtitleRTL : styles.subtitleLTR, rtlText]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnLTR: {
    marginLeft: -10,
  },
  backBtnRTL: {
    marginRight: -10,
  },
  backArrow: {
    fontSize: 26,
    lineHeight: 30,
    color: Colors.terracotta,
    fontFamily: Fonts.regular,
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: Fonts.extraBold,
    color: Colors.terracotta,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Colors.textLight,
  },
  subtitleLTR: {
    marginLeft: 34,
  },
  subtitleRTL: {
    marginRight: 34,
  },
});
