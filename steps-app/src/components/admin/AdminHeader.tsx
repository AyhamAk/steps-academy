import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type Props = {
  title: string;
  subtitle?: string;
  /** Tab roots have nowhere to go back to. */
  showBack?: boolean;
  /**
   * Where back should land, for a screen reachable from more than one place.
   *
   * `router.back()` retraces however you arrived, which is wrong for a screen
   * opened from a notification: an album entered that way would send you to
   * whatever you were doing before, not to the gallery you appear to be
   * inside. `dismissTo` pops to this route when it is already behind you and
   * navigates to it when it is not.
   */
  backTo?: string;
};

/**
 * One header for every admin sub-screen. The back arrow sits on the title's
 * centre line rather than below its baseline, and inside a 44x44 target.
 */
export default function AdminHeader({ title, subtitle, showBack = true, backTo }: Props) {
  const router = useRouter();
  const { isRTL, rtlText, t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, isRTL && styles.rowReverse]}>
        {showBack ? (
        <Pressable
          onPress={() => (backTo ? router.dismissTo(backTo as never) : router.back())}
          hitSlop={12}
          style={[styles.backBtn, isRTL ? styles.backBtnRTL : styles.backBtnLTR]}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <Text style={styles.backArrow}>{isRTL ? "→" : "←"}</Text>
        </Pressable>
        ) : null}
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
