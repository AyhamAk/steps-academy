import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { Tip, TipInput } from "../../services/tipsApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

const EMOJI_CHOICES = ["💡", "🌙", "🍎", "🧸", "🧩", "🎨", "📚", "🌿", "🧘", "☀️"];

/**
 * Write or edit one tip.
 *
 * Nine text fields is a lot for a phone, so only the academy's own language is
 * required — the Arabic and Hebrew columns are optional and fall back to it.
 * That means a tip can be published the day it is written and translated later,
 * rather than blocking on all three.
 */
export function TipFormModal({
  visible,
  tip,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  /** Null means "write a new one"; a tip means "edit this one". */
  tip: Tip | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: TipInput) => void;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(28);

  const [emoji, setEmoji] = useState("💡");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleHe, setTitleHe] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyHe, setBodyHe] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [minutes, setMinutes] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refill whenever the sheet opens, so editing never shows a stale tip.
  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setEmoji(tip?.emoji ?? "💡");
    setTitle(tip?.title ?? "");
    setTitleAr(tip?.titleAr ?? "");
    setTitleHe(tip?.titleHe ?? "");
    setExcerpt(tip?.excerpt ?? "");
    setBody(tip?.body ?? "");
    setBodyAr(tip?.bodyAr ?? "");
    setBodyHe(tip?.bodyHe ?? "");
    setMonth(String(tip?.month ?? now.getMonth() + 1));
    setYear(String(tip?.year ?? now.getFullYear()));
    setMinutes(String(tip?.minutes ?? 3));
    setIsPublished(tip?.isPublished ?? false);
    setError(null);
  }, [visible, tip]);

  const handleSubmit = () => {
    if (!title.trim()) return setError(t.tipsAdmin.titleRequired);
    if (!body.trim()) return setError(t.tipsAdmin.bodyRequired);

    const parsedMonth = Number(month);
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return setError(t.tipsAdmin.monthInvalid);
    }
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return setError(t.tipsAdmin.yearInvalid);
    }
    const parsedMinutes = minutes.trim() ? Number(minutes) : 3;
    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 120) {
      return setError(t.tipsAdmin.minutesInvalid);
    }

    onSubmit({
      emoji,
      title: title.trim(),
      titleAr: titleAr.trim() || null,
      titleHe: titleHe.trim() || null,
      excerpt: excerpt.trim() || null,
      body: body.trim(),
      bodyAr: bodyAr.trim() || null,
      bodyHe: bodyHe.trim() || null,
      month: parsedMonth,
      year: parsedYear,
      minutes: parsedMinutes,
      isPublished,
    });
  };

  const numeric = (value: string) => value.replace(/[^0-9]/g, "");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <Text style={styles.heading} maxFontSizeMultiplier={1.3}>
              {tip ? t.tipsAdmin.editTitle : t.tipsAdmin.createTitle}
            </Text>
            <Touchable onPress={onClose} hitSlop={12} accessibilityLabel={t.common.cancel}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldIcon}</Text>
            <View style={styles.emojiRow}>
              {EMOJI_CHOICES.map((choice) => (
                <Touchable
                  key={choice}
                  onPress={() => setEmoji(choice)}
                  accessibilityLabel={choice}
                  style={[styles.emojiTile, emoji === choice && styles.emojiTileActive]}
                >
                  <Text style={styles.emojiText}>{choice}</Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldTitle}</Text>
            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setError(null);
              }}
              placeholder={t.tipsAdmin.titlePlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldTitleAr}</Text>
            <TextInput
              value={titleAr}
              onChangeText={setTitleAr}
              placeholder={t.tipsAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldTitleHe}</Text>
            <TextInput
              value={titleHe}
              onChangeText={setTitleHe}
              placeholder={t.tipsAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldExcerpt}</Text>
            <TextInput
              value={excerpt}
              onChangeText={setExcerpt}
              placeholder={t.tipsAdmin.excerptPlaceholder}
              placeholderTextColor={Colors.textLight}
              multiline
              style={[styles.input, styles.inputMultiline, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldBody}</Text>
            <TextInput
              value={body}
              onChangeText={(value) => {
                setBody(value);
                setError(null);
              }}
              placeholder={t.tipsAdmin.bodyPlaceholder}
              placeholderTextColor={Colors.textLight}
              multiline
              style={[styles.input, styles.inputBody, rtlText]}
            />
            <Text style={[styles.hint, rtlText]}>{t.tipsAdmin.bodyHint}</Text>

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldBodyAr}</Text>
            <TextInput
              value={bodyAr}
              onChangeText={setBodyAr}
              placeholder={t.tipsAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              multiline
              style={[styles.input, styles.inputBody, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldBodyHe}</Text>
            <TextInput
              value={bodyHe}
              onChangeText={setBodyHe}
              placeholder={t.tipsAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              multiline
              style={[styles.input, styles.inputBody, rtlText]}
            />

            <View style={[styles.row, isRTL && styles.rowReverse]}>
              <View style={styles.flex}>
                <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldMonth}</Text>
                <TextInput
                  value={month}
                  onChangeText={(value) => {
                    setMonth(numeric(value));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  style={[styles.input, rtlText]}
                />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldYear}</Text>
                <TextInput
                  value={year}
                  onChangeText={(value) => {
                    setYear(numeric(value));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  style={[styles.input, rtlText]}
                />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.label, rtlText]}>{t.tipsAdmin.fieldMinutes}</Text>
                <TextInput
                  value={minutes}
                  onChangeText={(value) => {
                    setMinutes(numeric(value));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  style={[styles.input, rtlText]}
                />
              </View>
            </View>

            <View style={[styles.publishRow, isRTL && styles.rowReverse]}>
              <View style={styles.flex}>
                <Text style={[styles.label, styles.labelTight, rtlText]}>
                  {t.tipsAdmin.fieldPublished}
                </Text>
                <Text style={[styles.hint, rtlText]}>{t.tipsAdmin.publishedHint}</Text>
              </View>
              <Switch
                value={isPublished}
                onValueChange={setIsPublished}
                trackColor={{ false: Colors.border, true: Colors.forest }}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StepsButton
              label={isSaving ? t.tipsAdmin.saving : t.common.save}
              onPress={handleSubmit}
              disabled={isSaving}
              style={styles.submit}
            />
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
    maxHeight: "90%",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.bark,
    marginTop: 16,
    marginBottom: 6,
  },
  labelTight: { marginTop: 0, marginBottom: 2 },
  input: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  inputBody: { minHeight: 140, textAlignVertical: "top" },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
  },
  row: { flexDirection: "row", gap: 10 },
  publishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.linen,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiTileActive: { borderColor: Colors.honey, backgroundColor: Colors.honeyLight },
  emojiText: { fontSize: 22 },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.clay,
    marginTop: 14,
  },
  submit: { marginTop: 20, marginBottom: 8 },
});
