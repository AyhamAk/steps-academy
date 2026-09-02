import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import IconTile from "../ui/IconTile";
import { Touchable } from "../ui/Touchable";

/**
 * The newest album containing the selected child, as a single tappable row.
 *
 * Rendered only when there is one — an empty version of this would say nothing
 * the gallery tab does not already say better.
 */
export function NewPhotosRow({
  eventId,
  eventName,
  photoCount,
}: {
  eventId: string;
  eventName: string;
  photoCount: number;
}) {
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  return (
    <Touchable
      accessibilityLabel={t.home.newPhotosTitle}
      style={[styles.row, isRTL && styles.rowReverse]}
      onPress={() => router.push(`/gallery/${eventId}`)}
    >
      <IconTile tint={Colors.terracotta} size={38}>
        <Ionicons name="images-outline" size={19} color={Colors.terracotta} />
      </IconTile>
      <View style={styles.text}>
        <Text
          style={[styles.title, isRTL && styles.textRight]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {t.home.newPhotosTitle}
        </Text>
        <Text
          style={[styles.subtitle, isRTL && styles.textRight]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {t.home.newPhotosSubtitle(eventName, photoCount)}
        </Text>
      </View>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={18}
        color={Colors.textLight}
      />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.linen,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  text: {
    flex: 1,
  },
  textRight: {
    textAlign: "right",
  },
  title: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.bark,
  },
  subtitle: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 1,
  },
});
