import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { ar, en, he, Translations } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
import { SCHEDULE_SLOTS, ScheduleSlot, SlotDescriptions } from "../../services/scheduleApi";
import { Locale } from "../../store/localeStore";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

/** Arabic first: it is what the academy writes in. */
const LANGUAGES: { locale: Locale; strings: Translations }[] = [
  { locale: "ar", strings: ar },
  { locale: "en", strings: en },
  { locale: "he", strings: he },
];

type Draft = Record<ScheduleSlot, Record<Locale, string>>;

function toDraft(saved: SlotDescriptions | undefined): Draft {
  const draft = {} as Draft;
  for (const { slot } of SCHEDULE_SLOTS) {
    draft[slot] = {
      ar: saved?.[slot]?.ar ?? "",
      en: saved?.[slot]?.en ?? "",
      he: saved?.[slot]?.he ?? "",
    };
  }
  return draft;
}

type SlotDescriptionsModalProps = {
  visible: boolean;
  saved: SlotDescriptions | undefined;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (descriptions: SlotDescriptions) => void;
};

/**
 * The line under each nursery slot on a day the academy wrote nothing for.
 *
 * Each field shows the app's built-in line as its placeholder, so an empty
 * field reads as "keep this" rather than "blank", and clearing one restores it.
 */
export function SlotDescriptionsModal({
  visible,
  saved,
  isSaving,
  onClose,
  onSubmit,
}: SlotDescriptionsModalProps) {
  const { t, isRTL, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(28);
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));

  // Refill whenever the sheet opens, so it never shows a stale draft.
  useEffect(() => {
    if (visible) setDraft(toDraft(saved));
  }, [visible, saved]);

  const setText = (slot: ScheduleSlot, locale: Locale, value: string) =>
    setDraft((prev) => ({ ...prev, [slot]: { ...prev[slot], [locale]: value } }));

  const handleSubmit = () => {
    const result: SlotDescriptions = {};
    for (const { slot } of SCHEDULE_SLOTS) {
      for (const { locale } of LANGUAGES) {
        const text = draft[slot][locale].trim();
        if (text) result[slot] = { ...result[slot], [locale]: text };
      }
    }
    onSubmit(result);
  };

  const languageLabel: Record<Locale, string> = {
    ar: t.scheduleAdmin.langAr,
    en: t.scheduleAdmin.langEn,
    he: t.scheduleAdmin.langHe,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {t.scheduleAdmin.defaultsTitle}
            </Text>
            <Touchable onPress={onClose} hitSlop={12} accessibilityLabel={t.common.cancel}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>
          <Text style={[styles.hint, rtlText]}>{t.scheduleAdmin.defaultsHint}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {SCHEDULE_SLOTS.map(({ slot }) => (
              <View key={slot} style={styles.slotBlock}>
                <Text style={[styles.slotTitle, rtlText]}>{t.academy.slots[slot]}</Text>
                {LANGUAGES.map(({ locale, strings }) => (
                  <View key={locale}>
                    <Text style={[styles.label, rtlText]}>{languageLabel[locale]}</Text>
                    {/* Each field is in its own language's direction, whatever
                        language the app itself is in. */}
                    <TextInput
                      value={draft[slot][locale]}
                      onChangeText={(value) => setText(slot, locale, value)}
                      placeholder={strings.academy.slotDescriptions[slot]}
                      placeholderTextColor={Colors.textLight}
                      multiline
                      maxLength={300}
                      style={[
                        styles.input,
                        locale === "en" ? styles.inputLtr : styles.inputRtl,
                      ]}
                    />
                  </View>
                ))}
              </View>
            ))}

            <StepsButton
              label={t.common.save}
              onPress={handleSubmit}
              loading={isSaving}
              style={styles.submit}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "90%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: 6,
  },
  slotBlock: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginTop: 14,
  },
  slotTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.bark },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.bark,
    textAlignVertical: "top",
  },
  inputLtr: { textAlign: "left", writingDirection: "ltr" },
  inputRtl: { textAlign: "right", writingDirection: "rtl" },
  submit: { marginTop: 22 },
});
