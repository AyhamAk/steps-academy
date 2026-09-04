import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { Tip } from "../../services/tipsApi";
import { tipBody, tipTitle } from "../../utils/tipText";
import { Touchable } from "../ui/Touchable";

/**
 * One tip, read in full.
 *
 * A bottom sheet rather than a pushed screen, matching how course detail and
 * the join flow already work — a tip is something you glance into and dismiss,
 * not a place you navigate to and have to come back from.
 */
export function TipReaderModal({ tip, onClose }: { tip: Tip | null; onClose: () => void }) {
  const { t, isRTL, rtlText, locale } = useTranslation();
  const { sheetPadding } = useSheetPadding(28);

  if (!tip) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <View style={styles.emojiTile}>
              <Text style={styles.emoji}>{tip.emoji}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.month, rtlText]} maxFontSizeMultiplier={1.2}>
                {t.common.months[tip.month - 1]}
              </Text>
              <Text style={[styles.title, rtlText]} maxFontSizeMultiplier={1.3}>
                {tipTitle(tip, locale)}
              </Text>
            </View>
            <Touchable onPress={onClose} hitSlop={12} accessibilityLabel={t.common.done}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* The academy writes these by hand, so paragraphs come through as
                blank lines. Splitting on them keeps the spacing the author
                intended instead of one undifferentiated block. */}
            {tipBody(tip, locale)
              .split(/\n\s*\n/)
              .filter((paragraph) => paragraph.trim())
              .map((paragraph, index) => (
                <Text
                  key={index}
                  style={[styles.paragraph, rtlText]}
                  maxFontSizeMultiplier={1.6}
                >
                  {paragraph.trim()}
                </Text>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    maxHeight: "88%",
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.honeyLight,
    borderWidth: 1,
    borderColor: Colors.honey,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 24 },
  month: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.honeyDeep,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.bark,
  },
  close: { fontSize: 20, color: Colors.textLight },
  bodyScroll: { marginTop: 18 },
  bodyContent: { paddingBottom: 8 },
  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.bark,
    marginBottom: 14,
  },
});
