import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { MOCK_WEEK_SCHEDULE, pickLocalized, WeekDay } from "../../constants/mockData";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";

const ACADEMY_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu"];

/** The academy runs Sunday–Thursday; Fri/Sat fall back to Sunday. */
function todayAcademyDay(): WeekDay {
  return ACADEMY_DAYS[new Date().getDay()] ?? "sun";
}

/** Calendar date for each academy day in the week containing today. */
function datesForThisWeek(): Record<WeekDay, number> {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());

  const dates = {} as Record<WeekDay, number>;
  ACADEMY_DAYS.forEach((day, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    dates[day] = date.getDate();
  });
  return dates;
}

export function WeeklyScheduleSection() {
  const { t, locale, isRTL, rtlText } = useTranslation();
  const today = todayAcademyDay();
  const weekDates = datesForThisWeek();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(today);

  const dayData = MOCK_WEEK_SCHEDULE.find((day) => day.day === selectedDay);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtlText]}>{t.home.weeklyScheduleTitle}</Text>

      <View style={[styles.dayTabs, isRTL && styles.rowReverse]}>
        {MOCK_WEEK_SCHEDULE.map((day) => {
          const isSelected = day.day === selectedDay;
          const isToday = day.day === today;
          // Resolved once here rather than layered through conditional style
          // objects, so the label can never end up the same tone as its pill.
          const labelColor = isSelected ? "#FFFFFF" : Colors.textLight;
          const dateColor = isSelected ? "#FFFFFF" : Colors.bark;

          return (
            // Array style, never a style function: on this build a Pressable
            // with `style={({pressed}) => ...}` renders its children but drops
            // the resolved background/layout, which is what made these pills
            // look like bare text. Matches the Profile language pills.
            <Pressable
              key={day.day}
              onPress={() => setSelectedDay(day.day)}
              hitSlop={6}
              style={[
                styles.dayTab,
                isToday && !isSelected && styles.dayTabToday,
                isSelected && styles.dayTabActive,
              ]}
            >
              <Text
                style={[styles.dayName, { color: labelColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {t.home.weekDays[day.day]}
              </Text>
              <Text style={[styles.dayDate, { color: dateColor }]}>{weekDates[day.day]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scheduleCard}>
        {dayData?.activities.map((activity, index) => (
          <View
            key={activity.id}
            style={[
              styles.row,
              isRTL && styles.rowReverse,
              index < dayData.activities.length - 1 && styles.rowDivider,
            ]}
          >
            <View style={[styles.accentBar, { backgroundColor: activity.accentColor }]} />
            <Text style={styles.emoji}>{activity.emoji}</Text>
            <View style={styles.info}>
              <Text style={[styles.name, rtlText]}>{pickLocalized(activity.name, locale)}</Text>
              <Text style={[styles.meta, rtlText]}>
                {activity.time} · {t.home.scheduleDuration(activity.durationMinutes)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 12,
  },
  dayTabs: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
  },
  dayTab: {
    // flex:1 so the five days divide the full screen width evenly.
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.linen,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 62,
    gap: 3,
  },
  // Today is marked with a border only — tinting the text as well as the
  // background made honey-on-honey, which read as the label disappearing.
  dayTabToday: {
    borderColor: Colors.honey,
    borderWidth: 2,
  },
  dayTabActive: {
    backgroundColor: Colors.terracotta,
    borderColor: Colors.terracotta,
  },
  pressed: {
    opacity: 0.75,
  },
  dayName: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  dayDate: {
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
  scheduleCard: {
    backgroundColor: Colors.linen,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accentBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  emoji: {
    fontSize: 22,
    width: 28,
    textAlign: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.bark,
  },
  meta: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
});
