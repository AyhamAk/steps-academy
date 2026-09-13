import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
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
import { deleteEvent, GalleryEvent, updateEvent, updateEventAttendees } from "../../services/galleryApi";
import { Student } from "../../services/studentsApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";
import { AttendeePicker } from "./AttendeePicker";

/**
 * Everything an admin can do to an album itself: rename it, move it to another
 * date, change who was there, or delete it outright.
 *
 * Name and date go through one PATCH; attendees keep their own endpoint, which
 * already validates the ids. The attendee call only fires when the set actually
 * changed, so a rename doesn't rewrite the attendee rows for nothing.
 */
export function EventEditModal({
  event,
  students,
  onClose,
  onSaved,
  onDeleted,
}: {
  event: GalleryEvent | null;
  students: Student[];
  onClose: () => void;
  onSaved: (event: GalleryEvent) => void;
  onDeleted: (eventId: string) => void;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(24);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setName(event.name);
    setDate(event.date);
    setAttendeeIds(event.attendees.map((attendee) => attendee.id));
    setError(null);
  }, [event?.id]);

  if (!event) return null;

  const originalIds = event.attendees.map((attendee) => attendee.id);
  const attendeesChanged =
    attendeeIds.length !== originalIds.length ||
    attendeeIds.some((id) => !originalIds.includes(id));

  const handleSave = async () => {
    if (!name.trim() || !date.trim()) {
      setError(t.gallery.nameAndDateRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let saved = await updateEvent(event.id, { name: name.trim(), date: date.trim() });
      if (attendeesChanged) {
        saved = await updateEventAttendees(event.id, attendeeIds);
      }
      onSaved(saved);
      onClose();
    } catch {
      setError(t.gallery.couldntSaveAlbum);
    } finally {
      setIsSaving(false);
    }
  };

  // Deleting an album takes its photos with it, so the count goes in the prompt.
  const confirmDelete = () =>
    Alert.alert(
      t.gallery.deleteAlbumTitle,
      t.gallery.deleteAlbumMessage(event.name, event.photoCount),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.gallery.deleteAlbum,
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteEvent(event.id);
              onDeleted(event.id);
              onClose();
            } catch {
              setError(t.gallery.couldntDeleteAlbum);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <Text style={styles.title}>{t.gallery.editAlbum}</Text>
            <Touchable onPress={onClose} hitSlop={12} disabled={isSaving || isDeleting}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, rtlText]}>{t.gallery.eventNameLabel}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.gallery.eventNamePlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
              maxLength={100}
            />

            <Text style={[styles.label, rtlText]}>{t.gallery.dateLabel}</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder={t.gallery.datePlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <AttendeePicker
              students={students}
              selectedIds={attendeeIds}
              onChange={setAttendeeIds}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StepsButton
              label={t.common.save}
              onPress={handleSave}
              loading={isSaving}
              style={styles.saveButton}
            />

            <Touchable
              onPress={confirmDelete}
              disabled={isSaving || isDeleting}
              style={styles.deleteRow}
            >
              <Text style={styles.deleteText}>
                {isDeleting ? t.gallery.deletingAlbum : t.gallery.deleteAlbum}
              </Text>
            </Touchable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "88%",
  },
  rowReverse: { flexDirection: "row-reverse" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  body: { marginTop: 4 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textLight,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
  },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.clay,
    textAlign: "center",
    marginTop: 16,
  },
  saveButton: { marginTop: 24 },
  deleteRow: {
    marginTop: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.clay },
});
