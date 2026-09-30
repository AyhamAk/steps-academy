import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { formatBirthDate, parseIsoDate, toIsoDate } from "../../utils/date";
import { Touchable } from "../ui/Touchable";
import { authFieldStyles } from "./AuthTextField";

/**
 * How far back the picker goes. The academy's programs run to age 7; a few
 * years' slack covers an older sibling without offering 1950.
 */
const MAX_AGE_YEARS = 12;

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

/**
 * The child's birth date, as one field that opens the platform's own picker:
 * a wheel on iPhone, the calendar dialog on Android. `value` is "YYYY-MM-DD"
 * or null until one is chosen.
 */
export function BirthDateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string) => void;
}) {
  const { t, isRTL, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const textAlign = isRTL ? "right" : "left";

  const selected = value ? parseIsoDate(value) : null;
  // Opens on a typical course-age child rather than today, so most parents
  // scroll a year or two instead of five.
  const initial = selected ?? yearsAgo(4);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android's dialog closes itself on either button; iOS's wheel stays until "Done".
    if (Platform.OS === "android") setIsOpen(false);
    if (event.type === "set" && date) onChange(toIsoDate(date));
  };

  return (
    <View style={styles.field}>
      <Text style={[authFieldStyles.label, { textAlign }]} maxFontSizeMultiplier={1.3}>
        {t.invite.birthDateLabel}
      </Text>
      <Touchable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityLabel={t.invite.birthDateLabel}
        style={[authFieldStyles.box, isRTL && styles.rowReverse]}
      >
        <Text
          style={[authFieldStyles.value, { textAlign }, !selected && styles.placeholder]}
          maxFontSizeMultiplier={1.3}
        >
          {selected ? formatBirthDate(selected, t) : t.invite.birthDatePlaceholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={Colors.sage} />
      </Touchable>

      {isOpen ? (
        <>
          <DateTimePicker
            value={initial}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            minimumDate={yearsAgo(MAX_AGE_YEARS)}
            locale={locale}
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <Touchable
              onPress={() => {
                // A wheel left untouched still means "this date".
                if (!value) onChange(toIsoDate(initial));
                setIsOpen(false);
              }}
              style={styles.done}
            >
              <Text style={styles.doneText}>{t.common.done}</Text>
            </Touchable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  rowReverse: { flexDirection: "row-reverse" },
  placeholder: { color: Colors.textLight },
  done: { alignSelf: "center", minHeight: 44, minWidth: 88, justifyContent: "center" },
  doneText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.sage,
    textAlign: "center",
  },
});
