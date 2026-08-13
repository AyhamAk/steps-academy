import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { formatTime, getWeekSchedule, WEEK_DAYS, WeekDay } from "../../services/scheduleApi";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonScheduleRows } from "../ui/Skeleton";
import { Touchable } from "../ui/Touchable";

/** The academy runs Sunday–Thursday; Fri/Sat fall back to Sunday. */
function todayAcademyDay(): WeekDay {
  return WEEK_DAYS[new Date().getDay()] ?? "sun";
}

/** Calendar date for each academy day in the week containing today. */
function datesForThisWeek(): Record<WeekDay, number> {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());

  const dates = {} as Record<WeekDay, number>;
  WEEK_DAYS.forEach((day, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    dates[day] = date.getDate();
  });
  return dates;
}

export function WeeklyScheduleSection() {
  const { t, isRTL, rtlText } = useTranslation();
  const today = todayAcademyDay();
  const weekDates = datesForThisWeek();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(today);

  const { data: days, isPending, isError, refetch } = useQuery({
    queryKey: ["schedule"],
    queryFn: getWeekSchedule,
  });

  // Hide the whole section until the academy has set a timetable.
  if (days && days.every((day) => day.activities.length === 0)) return null;

  const dayData = days?.find((day) => day.day === selectedDay);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtlText]}>{t.home.weeklyScheduleTitle}</Text>

      <View style={[styles.dayTabs, isRTL && styles.rowReverse]}>
        {WEEK_DAYS.map((day) => {
          const isSelected = day === selectedDay;
          const isToday = day === today;
          // Resolved once here rather than layered through conditional style
          // objects, so the label can never end up the same tone as its pill.
          const labelColor = isSelected ? "#FFFFFF" : Colors.textLight;
          const dateColor = isSelected ? "#FFFFFF" : Colors.bark;

          return (
            <Touchable
              key={day}
              onPress={() => setSelectedDay(day)}
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
                {t.home.weekDays[day]}
              </Text>
              <Text style={[styles.dayDate, { color: dateColor }]}>{weekDates[day]}</Text>
            </Touchable>
          );
        })}
      </View>

      <View style={styles.scheduleCard}>
        {isPending ? (
          <SkeletonScheduleRows />
        ) : isError || !days ? (
          <DataErrorState compact onRetry={() => void refetch()} />
        ) : !dayData || dayData.activities.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{t.home.scheduleEmptyDay}</Text>
          </View>
        ) : (
          dayData.activities.map((activity, index) => (
            <View
              key={activity.id}
              style={[
                styles.row,
                isRTL && styles.rowReverse,
                index < dayData.activities.length - 1 && styles.rowDivider,
              ]}
            >
              <View
                style={[
                  styles.accentBar,
                  { backgroundColor: activity.accentColor ?? Colors.honey },
                ]}
              />
              <Text style={styles.emoji}>{activity.emoji}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, rtlText]}>{activity.name}</Text>
                <Text style={[styles.meta, rtlText]}>
                  {formatTime(activity.startTime)} ·{" "}
                  {t.home.scheduleDuration(activity.durationMinutes)}
                </Text>
              </View>
            </View>
          ))
        )}
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
  rowReverse: {
    flexDirection: "row-reverse",
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
  placeholder: { paddingVertical: 26, alignItems: "center" },
  placeholderText: { ...Type.caption, color: Colors.textLight },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
