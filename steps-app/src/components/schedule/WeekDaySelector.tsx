import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { track } from "../../services/analytics";
import { WEEK_DAYS, WeekDay } from "../../services/scheduleApi";
import { Touchable } from "../ui/Touchable";
import { datesForThisWeek, todayAcademyDay } from "./scheduleTime";

/**
 * The academy week as five chips, each showing its calendar date.
 *
 * Selection is lifted to the caller so the timeline beside it reads the same
 * value — the two used to be one component and shared state implicitly.
 */
export function WeekDaySelector({
  selected,
  onSelect,
}: {
  selected: WeekDay;
  onSelect: (day: WeekDay) => void;
}) {
  const { t, isRTL } = useTranslation();
  const today = todayAcademyDay();
  const weekDates = datesForThisWeek();

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      {WEEK_DAYS.map((day) => {
        const isSelected = day === selected;
        const isToday = day === today;
        // Resolved once here rather than layered through conditional style
        // objects, so the label can never end up the same tone as its pill.
        const labelColor = isSelected ? Colors.cream : Colors.textLight;
        const dateColor = isSelected ? Colors.cream : Colors.bark;

        return (
          <Touchable
            key={day}
            accessibilityLabel={t.home.weekDays[day]}
            onPress={() => {
              track("schedule_viewed", { view: day });
              onSelect(day);
            }}
            hitSlop={6}
            style={[
              styles.chip,
              isToday && !isSelected && styles.chipToday,
              isSelected && styles.chipActive,
            ]}
          >
            <Text
              style={[styles.dayName, { color: labelColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {t.home.weekDays[day]}
            </Text>
            <Text style={[styles.dayDate, { color: dateColor }]} maxFontSizeMultiplier={1.3}>
              {weekDates[day]}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  rowReverse: { flexDirection: "row-reverse" },
  chip: {
    // flex:1 so the five days divide the full width evenly. minHeight keeps
    // the chip a legal touch target even though it is visually compact.
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 11,
    // Outline only at rest: five filled pills competed with the timeline
    // below them for attention, and only one of them is actually selected.
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    gap: 2,
  },
  // Today is marked with a border only — tinting the text as well as the
  // background made honey-on-honey, which read as the label disappearing.
  chipToday: {
    borderColor: Colors.honey,
    borderWidth: 2,
  },
  chipActive: {
    backgroundColor: Colors.terracotta,
    borderColor: Colors.terracotta,
  },
  dayName: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },
  dayDate: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
});
