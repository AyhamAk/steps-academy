import { useEffect, useState } from "react";
import {
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
import { Type } from "../../constants/Typography";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { Course, CourseInput } from "../../services/coursesApi";
import { WEEK_DAYS, WeekDay } from "../../services/scheduleApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

const EMOJI_CHOICES = ["🎓", "🏊", "✍️", "🔬", "🎨", "🎵", "⚽", "🧘", "🍪", "📖", "🧩", "🌿"];
const COLOR_CHOICES = [
  Colors.terracotta,
  Colors.forest,
  Colors.sky,
  Colors.honey,
  Colors.clay,
];

type CourseFormModalProps = {
  visible: boolean;
  /** Null means "create new"; a course means "edit this one". */
  course: Course | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CourseInput) => void;
};

export function CourseFormModal({
  visible,
  course,
  isSaving,
  onClose,
  onSubmit,
}: CourseFormModalProps) {
  const { t, rtlText } = useTranslation();
  const sheetPadding = useSheetPadding(28);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameHe, setNameHe] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionHe, setDescriptionHe] = useState("");
  const [instructor, setInstructor] = useState("");
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [emoji, setEmoji] = useState("🎓");
  const [accentColor, setAccentColor] = useState<string>(Colors.terracotta);
  const [error, setError] = useState<string | null>(null);

  // Refill whenever the sheet opens, so editing never shows a stale course.
  useEffect(() => {
    if (!visible) return;
    setName(course?.name ?? "");
    setNameAr(course?.nameAr ?? "");
    setNameHe(course?.nameHe ?? "");
    setDescription(course?.description ?? "");
    setDescriptionAr(course?.descriptionAr ?? "");
    setDescriptionHe(course?.descriptionHe ?? "");
    setInstructor(course?.instructor ?? "");
    setWeekDays(course?.weekDays ?? []);
    const [h, m] = (course?.startTime ?? "").split(":");
    setHour(h ?? "");
    setMinute(m ?? "");
    setStartDate(course?.startDate ?? "");
    setEndDate(course?.endDate ?? "");
    setCapacity(course?.capacity ? String(course.capacity) : "");
    setEmoji(course?.emoji ?? "🎓");
    setAccentColor(course?.accentColor ?? Colors.terracotta);
    setError(null);
  }, [visible, course]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError(t.coursesAdmin.nameRequired);
      return;
    }
    const parsedCapacity = capacity.trim() ? Number(capacity) : 0;
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 0) {
      setError(t.coursesAdmin.capacityInvalid);
      return;
    }
    // A time is optional, but a half-entered one isn't.
    const hasTime = hour.trim() !== "" || minute.trim() !== "";
    const h = Number(hour), m = Number(minute);
    if (hasTime && (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(m) || m < 0 || m > 59)) {
      setError(t.coursesAdmin.timeInvalid);
      return;
    }

    const DATE = /^\d{4}-\d{2}-\d{2}$/;
    const badDate =
      (startDate.trim() && !DATE.test(startDate.trim())) ||
      (endDate.trim() && !DATE.test(endDate.trim())) ||
      (startDate.trim() && endDate.trim() && endDate.trim() < startDate.trim());
    if (badDate) {
      setError(t.coursesAdmin.datesInvalid);
      return;
    }

    onSubmit({
      name: name.trim(),
      nameAr: nameAr.trim() || null,
      nameHe: nameHe.trim() || null,
      description: description.trim() || null,
      descriptionAr: descriptionAr.trim() || null,
      descriptionHe: descriptionHe.trim() || null,
      instructor: instructor.trim() || null,
      weekDays,
      startTime: hasTime
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        : null,
      startDate: startDate.trim() || null,
      endDate: endDate.trim() || null,
      capacity: parsedCapacity,
      emoji,
      accentColor,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {course ? t.coursesAdmin.editTitle : t.coursesAdmin.createTitle}
            </Text>
            <Touchable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldIcon}</Text>
            <View style={styles.pickRow}>
              {EMOJI_CHOICES.map((choice) => (
                <Touchable
                  key={choice}
                  onPress={() => setEmoji(choice)}
                  style={[styles.emojiTile, emoji === choice && styles.emojiTileActive]}
                >
                  <Text style={styles.emojiText}>{choice}</Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldColor}</Text>
            <View style={styles.pickRow}>
              {COLOR_CHOICES.map((choice) => (
                <Touchable
                  key={choice}
                  onPress={() => setAccentColor(choice)}
                  style={[
                    styles.colorTile,
                    { backgroundColor: choice },
                    accentColor === choice && styles.colorTileActive,
                  ]}
                >
                  {accentColor === choice ? <Text style={styles.colorCheck}>✓</Text> : null}
                </Touchable>
              ))}
            </View>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldName}</Text>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder={t.coursesAdmin.namePlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            {/* Left blank, a parent reading in that language sees the name
                above — which is how every Arabic screen ended up showing
                "Swimming Lessons". */}
            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldNameAr}</Text>
            <TextInput
              value={nameAr}
              onChangeText={setNameAr}
              placeholder={t.coursesAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.rtlInput]}
            />

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldNameHe}</Text>
            <TextInput
              value={nameHe}
              onChangeText={setNameHe}
              placeholder={t.coursesAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.rtlInput]}
            />
            <Text style={[styles.hint, rtlText]}>{t.coursesAdmin.translationHint}</Text>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldDescription}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t.coursesAdmin.descriptionPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.textArea, rtlText]}
              multiline
            />

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldDescriptionAr}</Text>
            <TextInput
              value={descriptionAr}
              onChangeText={setDescriptionAr}
              placeholder={t.coursesAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.textArea, styles.rtlInput]}
              multiline
            />

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldDescriptionHe}</Text>
            <TextInput
              value={descriptionHe}
              onChangeText={setDescriptionHe}
              placeholder={t.coursesAdmin.translationPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.textArea, styles.rtlInput]}
              multiline
            />

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldInstructor}</Text>
            <TextInput
              value={instructor}
              onChangeText={setInstructor}
              placeholder={t.coursesAdmin.instructorPlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldDays}</Text>
            <View style={styles.pickRow}>
              {WEEK_DAYS.map((day) => {
                const isOn = weekDays.includes(day);
                return (
                  <Touchable
                    key={day}
                    onPress={() =>
                      setWeekDays((prev) =>
                        isOn ? prev.filter((d) => d !== day) : [...prev, day]
                      )
                    }
                    style={[styles.dayTile, isOn && styles.dayTileActive]}
                  >
                    <Text style={[styles.dayText, isOn && styles.dayTextActive]}>
                      {t.home.weekDays[day]}
                    </Text>
                  </Touchable>
                );
              })}
            </View>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldStartTime}</Text>
            <View style={styles.timeRow}>
              <TextInput
                value={hour}
                onChangeText={(v) => {
                  setHour(v.replace(/[^0-9]/g, "").slice(0, 2));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="15"
                placeholderTextColor={Colors.textLight}
                style={[styles.input, styles.timeInput]}
              />
              <Text style={styles.timeColon}>:</Text>
              <TextInput
                value={minute}
                onChangeText={(v) => {
                  setMinute(v.replace(/[^0-9]/g, "").slice(0, 2));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="30"
                placeholderTextColor={Colors.textLight}
                style={[styles.input, styles.timeInput]}
              />
            </View>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldDates}</Text>
            <View style={styles.timeRow}>
              <TextInput
                value={startDate}
                onChangeText={(v) => {
                  setStartDate(v);
                  setError(null);
                }}
                placeholder={t.coursesAdmin.startDatePlaceholder}
                placeholderTextColor={Colors.textLight}
                style={[styles.input, styles.flex]}
                autoCapitalize="none"
              />
              <Text style={styles.timeColon}>→</Text>
              <TextInput
                value={endDate}
                onChangeText={(v) => {
                  setEndDate(v);
                  setError(null);
                }}
                placeholder={t.coursesAdmin.endDatePlaceholder}
                placeholderTextColor={Colors.textLight}
                style={[styles.input, styles.flex]}
                autoCapitalize="none"
              />
            </View>
            <Text style={[styles.hint, rtlText]}>{t.coursesAdmin.datesHint}</Text>

            <Text style={[styles.label, rtlText]}>{t.coursesAdmin.fieldCapacity}</Text>
            <TextInput
              value={capacity}
              onChangeText={(value) => {
                setCapacity(value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              placeholder={t.coursesAdmin.capacityPlaceholder}
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              style={[styles.input, rtlText]}
            />
            <Text style={[styles.hint, rtlText]}>{t.coursesAdmin.capacityHint}</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StepsButton
              label={course ? t.coursesAdmin.saveChanges : t.coursesAdmin.createButton}
              onPress={handleSubmit}
              loading={isSaving}
              style={styles.submit}
            />
          </ScrollView>
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
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiTileActive: {
    borderColor: Colors.terracotta,
    borderWidth: 2.5,
    backgroundColor: `${Colors.terracotta}18`,
  },
  emojiText: { fontSize: 21 },
  colorTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorTileActive: { borderColor: Colors.bark },
  colorCheck: { color: "#FFFFFF", fontFamily: Fonts.bold, fontSize: 18 },
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
  textArea: { minHeight: 84, textAlignVertical: "top" },
  // These fields always hold RTL text, whatever language the admin's own
  // interface is in.
  rtlInput: { textAlign: "right", writingDirection: "rtl" },
  flex: { flex: 1 },
  dayTile: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
  },
  dayTileActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  dayText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.bark },
  dayTextActive: { color: "#FFFFFF" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: { width: 64, textAlign: "center", fontFamily: Fonts.bold, fontSize: 18 },
  timeColon: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textLight },
  hint: { ...Type.caption, color: Colors.textLight, marginTop: 6 },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: Colors.clay,
    marginTop: 14,
    textAlign: "center",
  },
  submit: { marginTop: 22 },
});
