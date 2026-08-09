import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { addPhotoTag, Photo, removePhotoTag, resolvePhotoUrl } from "../../services/galleryApi";
import { Student } from "../../services/studentsApi";
import { Touchable } from "../ui/Touchable";

type TagEditorModalProps = {
  photo: Photo | null;
  suggestions: Student[];
  onClose: () => void;
  onTagsChanged: (photo: Photo) => void;
};

export function TagEditorModal({ photo, suggestions, onClose, onTagsChanged }: TagEditorModalProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!photo) return null;

  // Only enrolled students can be tagged — free text would recreate the
  // name-matching hole that let same-named children leak across families.
  const handleAdd = async (studentId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await addPhotoTag(photo.id, studentId);
      onTagsChanged(updated);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (tagId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await removePhotoTag(photo.id, tagId);
      onTagsChanged(updated);
    } finally {
      setBusy(false);
    }
  };

  const query = draft.trim().toLowerCase();
  const filteredSuggestions = suggestions
    .filter((student) => !photo.tags.some((tag) => tag.studentId === student.id))
    .filter((student) => !query || student.name.toLowerCase().includes(query))
    .slice(0, 12);

  return (
    <Modal visible={!!photo} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.gallery.taggedKids}</Text>
            <Touchable onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={styles.preview} />

          <View style={styles.chipRow}>
            {photo.tags.map((tag) => (
              <Touchable key={tag.id} style={styles.chip} onPress={() => handleRemove(tag.id)}>
                <Text style={styles.chipText}>{tag.studentName} ✕</Text>
              </Touchable>
            ))}
            {photo.tags.length === 0 ? (
              <Text style={styles.noTags}>{t.gallery.noKidsTaggedYet}</Text>
            ) : null}
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t.gallery.searchKidName}
            placeholderTextColor={Colors.textLight}
            style={styles.input}
            returnKeyType="done"
          />

          {filteredSuggestions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.suggestionRow}
            >
              {filteredSuggestions.map((student) => (
                <Touchable
                  key={student.id}
                  style={styles.suggestionChip}
                  onPress={() => handleAdd(student.id)}
                >
                  <Text style={styles.suggestionText}>+ {student.name}</Text>
                </Touchable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noTags}>{t.gallery.noStudentsYet}</Text>
          )}

          {busy ? <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primary} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 22, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.text,
  },
  close: {
    fontSize: 20,
    color: Colors.textLight,
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: Colors.card,
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
    minHeight: 32,
    alignItems: "center",
  },
  chip: {
    backgroundColor: `${Colors.forest}20`,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.forest,
  },
  noTags: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  suggestionRow: {
    marginTop: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginEnd: 8,
  },
  suggestionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
  },
});
