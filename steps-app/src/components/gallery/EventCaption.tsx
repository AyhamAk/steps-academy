import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";

type EventCaptionProps = {
  caption: string | null | undefined;
  /** "card" clamps to 3 lines for the gallery list; "detail" shows it in full. */
  variant?: "card" | "detail";
};

/** Renders nothing when the event has no caption — there's no empty state by design. */
export function EventCaption({ caption, variant = "card" }: EventCaptionProps) {
  const { t, isRTL, rtlText } = useTranslation();

  if (!caption) return null;

  if (variant === "detail") {
    return (
      <View
        style={[styles.detail, isRTL ? styles.detailAccentRTL : styles.detailAccentLTR]}
      >
        <Text style={[styles.detailLabel, rtlText]}>💬 {t.gallery.captionNoteLabel}</Text>
        <Text style={[styles.detailText, rtlText]}>{caption}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, isRTL && styles.rowReverse]}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={[styles.cardText, rtlText]} numberOfLines={3}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${Colors.honey}1A`,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  emoji: {
    fontSize: 15,
    marginTop: 1,
  },
  cardText: {
    ...Type.caption,
    flex: 1,
    color: Colors.bark,
    lineHeight: 19,
    fontStyle: "italic",
  },
  detail: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  detailAccentLTR: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.honey,
  },
  detailAccentRTL: {
    borderRightWidth: 4,
    borderRightColor: Colors.honey,
  },
  detailLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.honey,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  detailText: {
    ...Type.body,
    fontSize: 14,
    color: Colors.bark,
    lineHeight: 22,
    fontStyle: "italic",
  },
});
