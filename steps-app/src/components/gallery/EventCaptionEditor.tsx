import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { updateEventCaption } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";

const MAX_LENGTH = 300;

type EventCaptionEditorProps = {
  eventId: string;
  caption: string | null;
  onSaved: (caption: string | null) => void;
};

/** Admin-only. One caption per event, shown to every parent on that event. */
export function EventCaptionEditor({ eventId, caption, onSaved }: EventCaptionEditorProps) {
  const { t, isRTL, rtlText } = useTranslation();
  const [draft, setDraft] = useState(caption ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft.trim() !== (caption ?? "").trim();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateEventCaption(eventId, draft.trim() || null);
      onSaved(updated.caption);
      Alert.alert(t.gallery.captionSaved, "", [{ text: t.common.ok }]);
    } catch {
      Alert.alert(t.gallery.captionCouldntSave, t.common.tryAgain, [{ text: t.common.ok }]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, isRTL ? styles.accentRTL : styles.accentLTR]}>
      <Text style={[styles.label, rtlText]}>{t.gallery.captionAdd}</Text>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={t.gallery.captionPlaceholder}
        placeholderTextColor={Colors.textLight}
        style={[styles.input, rtlText]}
        multiline
        maxLength={MAX_LENGTH}
      />

      <Text style={[styles.charCount, isRTL && styles.charCountRTL]}>
        {draft.length}/{MAX_LENGTH}
      </Text>

      <Touchable
        disabled={!isDirty || isSaving}
        onPress={handleSave}
        style={[styles.saveButton, (!isDirty || isSaving) && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? t.gallery.captionSaving : t.gallery.captionSave}
        </Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  accentLTR: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.terracotta,
  },
  accentRTL: {
    borderRightWidth: 4,
    borderRightColor: Colors.terracotta,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.terracotta,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.bark,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "right",
    marginTop: 4,
  },
  charCountRTL: {
    textAlign: "left",
  },
  saveButton: {
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
  saveButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
