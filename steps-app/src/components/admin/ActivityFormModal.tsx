import { useEffect, useState } from "react";
import {
  Modal,
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
import {
  ActivityInput,
  SCHEDULE_SLOTS,
  ScheduleActivity,
  ScheduleSlot,
  WeekDay,
} from "../../services/scheduleApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

const EMOJI_CHOICES = ["🌟", "☀️", "🎨", "🎵", "🌿", "📖", "🧩", "🔢", "🧘", "🍪", "🎈", "🖐", "⚽", "🔬"];
const COLOR_CHOICES = [Colors.gold, Colors.sage, Colors.coral, Colors.blue, Colors.rose];
const DURATIONS = [15, 20, 30, 45, 60, 90];

type ActivityFormModalProps = {
  visible: boolean;
  day: WeekDay;
  activity: ScheduleActivity | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: ActivityInput) => void;
};

export function ActivityFormModal({
  visible,
  day,
  activity,
  isSaving,
  onClose,
  onSubmit,
}: ActivityFormModalProps) {
  const { t, isRTL, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(28);
  const [slot, setSlot] = useState<ScheduleSlot | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌟");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(30);
  const [accentColor, setAccentColor] = useState<string>(Colors.gold);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = (activity?.startTime ?? "09:00").split(":");
    setSlot(activity?.slot ?? null);
    setName(activity?.name ?? "");
    setEmoji(activity?.emoji ?? "🌟");
    setHour(h);
    setMinute(m);
    setDuration(activity?.durationMinutes ?? 30);
    setAccentColor(activity?.accentColor ?? Colors.gold);
    setError(null);
  }, [visible, activity]);

  /**
   * Picking a slot for a new activity fills in the academy's usual time for
   * it. An existing activity keeps its own time — it was set on purpose.
   */
  const pickSlot = (next: ScheduleSlot) => {
    setSlot(next);
    setError(null);
    if (activity) return;
    const defaults = SCHEDULE_SLOTS.find((entry) => entry.slot === next);
    if (!defaults) return;
    const [h, m] = defaults.startTime.split(":");
    setHour(h);
    setMinute(m);
    setDuration(defaults.durationMinutes);
  };

  // A slot's usual length (75, 115…) or an older activity's odd one still
  // shows as a selected chip rather than leaving none highlighted.
  const durationChoices = DURATIONS.includes(duration)
    ? DURATIONS
    : [...DURATIONS, duration].sort((a, b) => a - b);

  const handleSubmit = () => {
    // The name is optional — "just the slot" is a real case, like reception.
    if (!slot) {
      setError(t.scheduleAdmin.slotRequired);
      return;
    }
    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(m) || m < 0 || m > 59) {
      setError(t.scheduleAdmin.timeInvalid);
      return;
    }
    onSubmit({
      day,
      slot,
      name: name.trim() || null,
      emoji,
      startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      durationMinutes: duration,
      accentColor,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {activity ? t.scheduleAdmin.editTitle : t.scheduleAdmin.addTitle}
            </Text>
            <Touchable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>
          <Text style={styles.dayHint}>{t.home.weekDays[day]}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldSlot}</Text>
            <View style={[styles.pickRow, isRTL && styles.rowReverse]}>
              {SCHEDULE_SLOTS.map(({ slot: choice }) => (
                <Touchable
                  key={choice}
                  onPress={() => pickSlot(choice)}
                  accessibilityLabel={t.academy.slots[choice]}
                  style={[styles.durationTile, slot === choice && styles.durationTileActive]}
                >
                  <Text
                    style={[styles.durationText, slot === choice && styles.durationTextActive]}
                  >
                    {t.academy.slots[choice]}
                  </Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldName}</Text>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder={t.scheduleAdmin.namePlaceholder}
              placeholderTextColor={Colors.textLight}
              style={[styles.input, rtlText]}
            />

            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldIcon}</Text>
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

            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldTime}</Text>
            {/* Two fields rather than a native picker — no extra native module,
                and it works identically on both platforms. */}
            <View style={styles.timeRow}>
              <TextInput
                value={hour}
                onChangeText={(v) => {
                  setHour(v.replace(/[^0-9]/g, "").slice(0, 2));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.timeInput]}
                placeholder="09"
                placeholderTextColor={Colors.textLight}
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
                style={[styles.input, styles.timeInput]}
                placeholder="00"
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.timeHint}>{t.scheduleAdmin.timeHint}</Text>
            </View>

            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldDuration}</Text>
            <View style={styles.pickRow}>
              {durationChoices.map((minutes) => (
                <Touchable
                  key={minutes}
                  onPress={() => setDuration(minutes)}
                  style={[styles.durationTile, duration === minutes && styles.durationTileActive]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      duration === minutes && styles.durationTextActive,
                    ]}
                  >
                    {minutes}
                  </Text>
                </Touchable>
              ))}
            </View>

            <Text style={[styles.label, rtlText]}>{t.scheduleAdmin.fieldColor}</Text>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <StepsButton
              label={activity ? t.scheduleAdmin.saveChanges : t.scheduleAdmin.addButton}
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
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  dayHint: { ...Type.caption, color: Colors.sage, fontFamily: Fonts.bold, marginTop: 2 },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowReverse: { flexDirection: "row-reverse" },
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
    borderColor: Colors.sage,
    borderWidth: 2.5,
    backgroundColor: `${Colors.sage}18`,
  },
  emojiText: { fontSize: 21 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInput: { width: 64, textAlign: "center", fontFamily: Fonts.bold, fontSize: 18 },
  timeColon: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.bark },
  timeHint: { ...Type.caption, color: Colors.textLight, flex: 1, marginStart: 6 },
  durationTile: {
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
  },
  durationTileActive: { backgroundColor: Colors.sage, borderColor: Colors.sage },
  durationText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.bark },
  durationTextActive: { color: Colors.white },
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
  colorCheck: { color: Colors.white, fontFamily: Fonts.bold, fontSize: 18 },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: Colors.rose,
    marginTop: 14,
    textAlign: "center",
  },
  submit: { marginTop: 22 },
});
