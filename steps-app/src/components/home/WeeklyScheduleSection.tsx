import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { track } from "../../services/analytics";
import { useTranslation } from "../../i18n/useTranslation";
import {
  formatTime,
  getWeekSchedule,
  ScheduleActivity,
  WEEK_DAYS,
  WeekDay,
} from "../../services/scheduleApi";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonScheduleRows } from "../ui/Skeleton";
import SectionLabel from "../ui/SectionLabel";
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

/** Minutes since midnight, the unit the now marker is positioned in. */
function minutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function toMinutes(startTime: string): number {
  const [hour, minute] = startTime.split(":");
  return Number(hour) * 60 + Number(minute);
}

/**
 * Where the day has got to, drawn across the rail.
 *
 * This is the one thing a list can't show and the reason a parent opens the
 * app mid-morning: not what happens today, but what is happening right now.
 */
function NowLine({ isRTL, label }: { isRTL: boolean; label: string }) {
  return (
    <View style={[styles.nowRow, isRTL && styles.rowReverse]}>
      <Text style={[styles.nowLabel, isRTL ? styles.timeRTL : styles.timeLTR]}>{label}</Text>
      <View style={styles.rail}>
        <View style={styles.nowDot} />
      </View>
      <View style={styles.nowLine} />
    </View>
  );
}

export function WeeklyScheduleSection() {
  const { t, isRTL, rtlText } = useTranslation();
  const today = todayAcademyDay();
  const weekDates = datesForThisWeek();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(today);
  // Re-render on the minute so the now marker moves on its own — a parent who
  // leaves the app open should not have to pull to refresh to see it advance.
  const [nowMinutes, setNowMinutes] = useState(minutesNow);

  useEffect(() => {
    const id = setInterval(() => setNowMinutes(minutesNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: days, isPending, isError, refetch } = useQuery({
    queryKey: ["schedule"],
    queryFn: getWeekSchedule,
  });

  // Hide the whole section until the academy has set a timetable.
  if (days && days.every((day) => day.activities.length === 0)) return null;

  const dayData = days?.find((day) => day.day === selectedDay);

  // Activities sharing a start time share one slot. On a list two 9:00 entries
  // read as two unrelated rows; on a timeline they visibly collide, which is
  // the point — the academy has double-booked and should see it.
  type Slot = { startTime: string; activities: ScheduleActivity[] };
  const slots: Slot[] = [...(dayData?.activities ?? [])]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .reduce<Slot[]>((acc, activity) => {
      const last = acc[acc.length - 1];
      if (last && last.startTime === activity.startTime) last.activities.push(activity);
      else acc.push({ startTime: activity.startTime, activities: [activity] });
      return acc;
    }, []);

  // Index of the first slot still to come; slots.length once the day is done,
  // and -1 on any day that isn't today, which hides the marker entirely.
  const nextSlot = slots.findIndex((slot) => toMinutes(slot.startTime) > nowMinutes);
  const nowBefore =
    selectedDay !== today ? -1 : nextSlot === -1 ? slots.length : nextSlot;
  const nowLabel = formatTime(
    `${String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:${String(nowMinutes % 60).padStart(2, "0")}`,
    t
  );

  return (
    <View style={styles.section}>
      <SectionLabel label={t.home.weeklyScheduleTitle} />

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
              onPress={() => {
                track("schedule_viewed", { view: day });
                setSelectedDay(day);
              }}
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

      {isPending ? (
        <SkeletonScheduleRows />
      ) : isError || !days ? (
        <DataErrorState compact onRetry={() => void refetch()} />
      ) : !dayData || dayData.activities.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{t.home.scheduleEmptyDay}</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {slots.map((slot, index) => {
            const isLast = index === slots.length - 1;
            return (
              <View key={slot.startTime}>
                {/* The now marker sits between the slot it has passed and the
                    one still to come, rather than at a proportional offset:
                    the rail isn't drawn to scale, so a fractional position
                    would point at nothing in particular. */}
                {nowBefore === index ? <NowLine isRTL={isRTL} label={nowLabel} /> : null}

                <View style={[styles.slot, isRTL && styles.rowReverse]}>
                  <Text
                    style={[styles.time, isRTL ? styles.timeRTL : styles.timeLTR]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatTime(slot.startTime, t)}
                  </Text>

                  {/* The rail and the dot are one column: the rail runs the
                      full height of the slot so consecutive slots join up,
                      and the dot sits on top of it at the title's baseline. */}
                  <View style={styles.rail}>
                    {isLast ? null : <View style={styles.railLine} />}
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: slot.activities[0].accentColor ?? Colors.honey },
                      ]}
                    />
                  </View>

                  <View style={styles.slotBody}>
                    {slot.activities.map((activity) => (
                      <View key={activity.id} style={styles.entry}>
                        <Text
                          style={[styles.name, rtlText]}
                          maxFontSizeMultiplier={1.3}
                        >
                          {activity.name}
                        </Text>
                        <Text style={[styles.duration, rtlText]} maxFontSizeMultiplier={1.4}>
                          {t.home.scheduleDuration(activity.durationMinutes)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Everything today has already started. */}
          {nowBefore === slots.length ? <NowLine isRTL={isRTL} label={nowLabel} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
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
  placeholder: { paddingVertical: 26, alignItems: "center" },
  placeholderText: { ...Type.caption, color: Colors.textLight },
  // No card. The schedule sits directly on the page, which is what separates
  // it from the boxed sections above it — a sequence, not a collection.
  timeline: { paddingTop: 6 },
  slot: { flexDirection: "row", gap: 10 },
  // Fixed gutter: the times line up as one column you can scan straight down,
  // which is the whole point of leading with them.
  time: {
    width: 74,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.bark,
    writingDirection: "ltr",
  },
  timeLTR: { textAlign: "right" },
  timeRTL: { textAlign: "left" },
  // The rail stretches to the full height of the slot, so consecutive dots are
  // joined by one unbroken line rather than a series of stubs.
  rail: { width: 14, alignItems: "center" },
  railLine: {
    position: "absolute",
    top: 6,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.border,
  },
  // Category colour lives here now that the accent bar is gone.
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginTop: 4.5,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  slotBody: { flex: 1, paddingBottom: 20 },
  entry: { marginBottom: 2 },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bark,
  },
  duration: { ...Type.caption, color: Colors.textLight, marginTop: 1 },
  nowRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingBottom: 20 },
  nowLabel: {
    width: 74,
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.terracotta,
    writingDirection: "ltr",
  },
  nowDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.terracotta },
  nowLine: { flex: 1, height: 1.5, backgroundColor: Colors.terracotta, borderRadius: 1 },
});
