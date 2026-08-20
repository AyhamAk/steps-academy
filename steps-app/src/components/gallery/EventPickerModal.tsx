import { useState } from "react";
import {
  ActivityIndicator,
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
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { createEvent, GalleryEvent } from "../../services/galleryApi";
import { Student } from "../../services/studentsApi";
import { formatIsoDate } from "../../utils/date";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

type EventPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  events: GalleryEvent[];
  students: Student[];
  onSelectExisting: (event: GalleryEvent) => void;
  onCreated: (event: GalleryEvent) => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EventPickerModal({
  visible,
  onClose,
  events,
  students,
  onSelectExisting,
  onCreated,
}: EventPickerModalProps) {
  const { t } = useTranslation();
  const sheetPadding = useSheetPadding(32);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("list");
    setName("");
    setDate(todayIso());
    setAttendeeIds([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || !date.trim()) {
      setError(t.gallery.eventNameDateRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const event = await createEvent({ name: name.trim(), date: date.trim(), attendeeIds });
      reset();
      onCreated(event);
    } catch {
      setError(t.gallery.couldntCreateEvent);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === "list" ? t.gallery.chooseEvent : t.gallery.newEvent}
            </Text>
            <Touchable onPress={handleClose}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          {mode === "list" ? (
            <ScrollView style={styles.list}>
              <Touchable style={styles.createRow} onPress={() => setMode("create")}>
                <Text style={styles.createRowText}>{t.gallery.createNewEvent}</Text>
              </Touchable>
              {events.map((event) => (
                <Touchable
                  key={event.id}
                  style={styles.eventRow}
                  onPress={() => {
                    reset();
                    onSelectExisting(event);
                  }}
                >
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventMeta}>
                    {t.gallery.eventMeta(
                      formatIsoDate(event.date, t),
                      event.photoCount,
                      (event.attendees ?? []).length
                    )}
                  </Text>
                </Touchable>
              ))}
              {events.length === 0 ? (
                <Text style={styles.emptyText}>{t.gallery.noEventsCreateFirst}</Text>
              ) : null}
            </ScrollView>
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>{t.gallery.eventNameLabel}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.gallery.eventNamePlaceholder}
                placeholderTextColor={Colors.textLight}
                style={styles.input}
              />

              <Text style={styles.label}>{t.gallery.dateLabel}</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder={t.gallery.datePlaceholder}
                placeholderTextColor={Colors.textLight}
                style={styles.input}
              />

              <Text style={styles.label}>{t.gallery.kidsWhoAttended}</Text>
              {students.length === 0 ? (
                <Text style={styles.emptyText}>{t.gallery.noStudentsYet}</Text>
              ) : (
                <View style={styles.studentGrid}>
                  {students.map((student) => {
                    const isSelected = attendeeIds.includes(student.id);
                    return (
                      <Touchable
                        key={student.id}
                        onPress={() =>
                          setAttendeeIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== student.id)
                              : [...prev, student.id]
                          )
                        }
                        style={[styles.studentChip, isSelected && styles.studentChipSelected]}
                      >
                        <Text
                          style={[
                            styles.studentChipText,
                            isSelected && styles.studentChipTextSelected,
                          ]}
                        >
                          {isSelected ? "✓ " : ""}
                          {student.name}
                        </Text>
                      </Touchable>
                    );
                  })}
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <StepsButton
                  label={t.gallery.createEvent}
                  onPress={handleCreate}
                  loading={isSaving}
                />
                <Touchable
                  onPress={() => setMode("list")}
                  style={styles.backLink}
                  disabled={isSaving}
                >
                  <Text style={styles.backLinkText}>{t.common.back}</Text>
                </Touchable>
              </View>
            </ScrollView>
          )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.text,
  },
  close: {
    fontSize: 20,
    color: Colors.textLight,
  },
  list: {
    marginBottom: 4,
  },
  createRow: {
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  createRowText: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
    fontSize: 15,
  },
  eventRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  eventName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.text,
  },
  eventMeta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  studentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  studentChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  studentChipSelected: {
    backgroundColor: Colors.terracotta,
    borderColor: Colors.terracotta,
  },
  studentChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.bark,
  },
  studentChipTextSelected: {
    color: "#FFFFFF",
  },
  emptyText: {
    fontFamily: Fonts.regular,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 20,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  error: {
    fontFamily: Fonts.semiBold,
    color: Colors.clay,
    marginTop: 12,
    textAlign: "center",
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 6,
  },
  backLinkText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textLight,
  },
});
