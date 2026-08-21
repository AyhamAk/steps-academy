import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { track } from "../../services/analytics";
import { useTranslation } from "../../i18n/useTranslation";
import {
  formatTimeColumn,
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

/** Vertical centre of a dot, measured from the top of its row. */
const DOT_CENTER = 11;

/**
 * The rail has to carry the "sequence" meaning on a dim screen, and
 * Colors.border against the cream background is barely above 1:1. This is
 * the same hue family, several steps darker.
 */
const RAIL_COLOR = "#C6B594";

/**
 * Where the day has got to, drawn across the rail.
 *
 * This is the one thing a list can't show and the reason a parent opens the
 * app mid-morning: not what happens today, but what is happening right now.
 * It is a row on the rail like any other — the rail runs through it — so it
 * reads as a position in time rather than a divider between two groups.
 */
function NowLine({
  isRTL,
  label,
  lineStyle,
}: {
  isRTL: boolean;
  label: string;
  lineStyle: ViewStyle | null;
}) {
  return (
    <View style={[styles.nowRow, isRTL && styles.rowReverse]}>
      <Text
        style={[styles.nowLabel, isRTL ? styles.timeRTL : styles.timeLTR]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      <View style={styles.rail}>
        {lineStyle ? <View style={[styles.railLine, lineStyle]} /> : null}
        {/* A ring, not another filled dot. Same-colour, same-size circles
            left the marker looking like one more activity. */}
        <View style={styles.nowRing}>
          <View style={styles.nowCore} />
        </View>
      </View>
      <View style={styles.nowBody}>
        <View style={styles.nowLine} />
      </View>
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

  // Every activity gets its own dot, including two that start at the same
  // time. Stacking the second under the first made it read as a sub-step of
  // the first rather than a second thing happening at that hour.
  const sorted = [...(dayData?.activities ?? [])].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const isToday = selectedDay === today;
  // A day earlier in the week is over in its entirety; today is split at the
  // current minute; a later day has nothing behind it yet.
  const dayIsOver = WEEK_DAYS.indexOf(selectedDay) < WEEK_DAYS.indexOf(today);

  type Row =
    | { kind: "activity"; key: string; activity: ScheduleActivity; isPast: boolean }
    | { kind: "now"; key: string };

  const rows: Row[] = [];
  let nowPlaced = !isToday;
  for (const activity of sorted) {
    if (!nowPlaced && toMinutes(activity.startTime) > nowMinutes) {
      rows.push({ kind: "now", key: "now" });
      nowPlaced = true;
    }
    rows.push({
      kind: "activity",
      key: activity.id,
      activity,
      isPast: dayIsOver || (isToday && toMinutes(activity.startTime) <= nowMinutes),
    });
  }
  // Everything today has already started, so now sits at the end.
  if (!nowPlaced) rows.push({ kind: "now", key: "now" });

  /**
   * The rail segment for one row. Drawn per row rather than as a single
   * background line so it can stop at the first and last dots instead of
   * overshooting into the section above and below.
   */
  const railFor = (index: number): ViewStyle | null => {
    if (rows.length < 2) return null;
    if (index === 0) return styles.railLineFirst;
    if (index === rows.length - 1) return styles.railLineLast;
    return styles.railLineThrough;
  };

  const nowLabel = formatTimeColumn(
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
          {rows.map((row, index) => {
            const line = railFor(index);

            if (row.kind === "now") {
              return <NowLine key={row.key} isRTL={isRTL} label={nowLabel} lineStyle={line} />;
            }

            const { activity, isPast } = row;

            return (
              <View key={row.key} style={[styles.slot, isRTL && styles.rowReverse]}>
                <Text
                  style={[
                    styles.time,
                    isRTL ? styles.timeRTL : styles.timeLTR,
                    isPast && styles.past,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  maxFontSizeMultiplier={1.3}
                >
                  {formatTimeColumn(activity.startTime, t)}
                </Text>

                <View style={styles.rail}>
                  {line ? <View style={[styles.railLine, line]} /> : null}
                  {/* Hollow once it has happened, filled while it is still to
                      come — so the now marker has something to separate. */}
                  <View style={[styles.dot, isPast && styles.dotPast]} />
                </View>

                {/* Name and duration sit at opposite ends of the row rather
                    than stacked at the leading edge, so the line spans the
                    width instead of hugging the rail. */}
                <View
                  style={[
                    styles.slotBody,
                    isRTL && styles.rowReverse,
                    isPast && styles.past,
                  ]}
                >
                  <Text
                    style={[styles.name, rtlText, styles.flex]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {activity.name}
                  </Text>
                  <Text style={styles.duration} maxFontSizeMultiplier={1.4}>
                    {t.home.scheduleDuration(activity.durationMinutes)}
                  </Text>
                </View>
              </View>
            );
          })}
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
    width: 78,
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.bark,
    writingDirection: "ltr",
    // Fixed-width digits: without them "1" is narrower than "8" and the
    // column wanders by a pixel or two on every row.
    fontVariant: ["tabular-nums"],
  },
  timeLTR: { textAlign: "right" },
  timeRTL: { textAlign: "left" },
  // The rail stretches to the full height of the slot, so consecutive dots are
  // joined by one unbroken line rather than a series of stubs.
  rail: { width: 14, alignItems: "center" },
  railLine: {
    position: "absolute",
    width: 2,
    backgroundColor: RAIL_COLOR,
  },
  // Runs the full height, joining the dot above to the dot below.
  railLineThrough: { top: 0, bottom: 0 },
  // The ends stop at the dot rather than overshooting into the section.
  railLineFirst: { top: DOT_CENTER, bottom: 0 },
  railLineLast: { top: 0, height: DOT_CENTER },
  // One neutral tone. The per-activity accent colours decoded to nothing —
  // no legend, no repetition across days — and one of them was the same
  // orange as the now marker, which is the only colour here that means
  // something. accentColor is still in the data, just not shown here.
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: DOT_CENTER - 5.5,
    borderWidth: 2,
    backgroundColor: Colors.textLight,
    borderColor: Colors.background,
  },
  // Hollow once it has happened, so the now marker separates two states.
  dotPast: { backgroundColor: Colors.background, borderColor: Colors.textLight },
  slotBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingBottom: 18,
  },
  flex: { flex: 1 },
  // Behind the now marker. Dimmed rather than hidden: it is still today.
  past: { opacity: 0.4 },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bark,
  },
  duration: { ...Type.caption, color: Colors.textLight },
  // No alignItems and no padding of its own: the rail has to stretch the
  // full height of the row, exactly as it does on an activity row.
  nowRow: { flexDirection: "row", gap: 10 },
  nowLabel: {
    width: 78,
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 20,
    color: Colors.terracotta,
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  nowRing: {
    width: 15,
    height: 15,
    borderRadius: 8,
    marginTop: DOT_CENTER - 7.5,
    borderWidth: 2,
    borderColor: Colors.terracotta,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  nowCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.terracotta },
  // Deliberately tighter than an activity row: the marker is anchored to
  // the next upcoming item, and an even gap made it look like a
  // proportional position between two items it is not measuring.
  nowBody: { flex: 1, paddingBottom: 8 },
  // Sits on the dot centre so the marker reads as one horizontal line.
  nowLine: {
    height: 1.5,
    marginTop: DOT_CENTER - 0.75,
    backgroundColor: Colors.terracotta,
    borderRadius: 1,
  },
});
