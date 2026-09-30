import { StyleSheet, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";

export type BirthDateParts = { day: string; month: string; year: string };

export const EMPTY_BIRTH_DATE: BirthDateParts = { day: "", month: "", year: "" };

/**
 * "2021-05-14" from what the parent typed, or null if it isn't a real date
 * that has already happened. Round-trips through Date so 31/02 is rejected
 * rather than silently becoming 3 March.
 */
export function toIsoBirthDate({ day, month, year }: BirthDateParts): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (iso > today || iso < "1990-01-01") return null;
  return iso;
}

/**
 * Day, month and year as three number boxes. Three boxes rather than a date
 * picker: no new native dependency, and a parent types a birthday they know
 * by heart faster than they scroll to it. Day sits on the reading side, so it
 * is rightmost in Arabic and Hebrew.
 */
export function BirthDateInput({
  value,
  onChange,
}: {
  value: BirthDateParts;
  onChange: (value: BirthDateParts) => void;
}) {
  const { t, isRTL } = useTranslation();
  const digits = (text: string) => text.replace(/\D/g, "");

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <TextInput
        style={[styles.box, styles.small]}
        placeholder={t.invite.dayPlaceholder}
        placeholderTextColor={Colors.textLight}
        value={value.day}
        onChangeText={(text) => onChange({ ...value, day: digits(text) })}
        keyboardType="number-pad"
        maxLength={2}
      />
      <TextInput
        style={[styles.box, styles.small]}
        placeholder={t.invite.monthPlaceholder}
        placeholderTextColor={Colors.textLight}
        value={value.month}
        onChangeText={(text) => onChange({ ...value, month: digits(text) })}
        keyboardType="number-pad"
        maxLength={2}
      />
      <TextInput
        style={[styles.box, styles.large]}
        placeholder={t.invite.yearPlaceholder}
        placeholderTextColor={Colors.textLight}
        value={value.year}
        onChangeText={(text) => onChange({ ...value, year: digits(text) })}
        keyboardType="number-pad"
        maxLength={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  rowReverse: { flexDirection: "row-reverse" },
  box: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...Type.body,
    color: Colors.text,
    textAlign: "center",
    minHeight: 48,
  },
  small: { flex: 1 },
  large: { flex: 1.6 },
});
