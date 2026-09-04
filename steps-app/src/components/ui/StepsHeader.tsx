import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "../../i18n/useTranslation";
import { Colors } from "../../constants/Colors";
import { Type } from "../../constants/Typography";
import { Touchable } from "./Touchable";

type StepsHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** An optional action on the trailing edge, the way SectionLabel has one. */
  actionLabel?: string;
  onActionPress?: () => void;
};

export function StepsHeader({
  title,
  subtitle,
  showBack,
  actionLabel,
  onActionPress,
}: StepsHeaderProps) {
  const { isRTL, rtlText } = useTranslation();

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      {showBack ? (
        <Touchable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{isRTL ? "→" : "←"}</Text>
        </Touchable>
      ) : null}
      <View style={styles.titleBlock}>
        <Text style={[styles.title, rtlText]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, rtlText]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Touchable onPress={onActionPress} hitSlop={12} accessibilityLabel={actionLabel}>
          <Text style={styles.action} maxFontSizeMultiplier={1.3}>
            {actionLabel}
          </Text>
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  titleBlock: {
    flex: 1,
  },
  backButton: {
    paddingEnd: 4,
  },
  backArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  title: {
    ...Type.display,
    color: Colors.primary,
  },
  subtitle: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  action: {
    ...Type.caption,
    color: Colors.terracotta,
  },
});
