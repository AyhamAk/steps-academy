import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { formatTimeColumn, ScheduleActivity, WeekDay } from "../../services/scheduleApi";
import { dayIsOver, toMinutes, todayAcademyDay } from "./scheduleTime";

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
        <View style={styles.nowDot} />
      </View>
      <View style={styles.nowBody}>
        <View style={styles.nowLine} />
      </View>
    </View>
  );
}

type Row =
  | { kind: "activity"; key: string; activity: ScheduleActivity; isPast: boolean; isCurrent: boolean }
  | { kind: "now"; key: string };

/**
 * One day's activities on a rail, with a marker for the current moment.
 *
 * A finished activity is not dimmed. It used to drop the whole row to 40%
 * opacity, which read as disabled rather than done — the parent still wants
 * to know what their child did this morning. Only the dot changes state, and
 * a forest tick says "happened".
 */
export function DayTimeline({
  activities,
  selectedDay,
  nowMinutes,
}: {
  activities: ScheduleActivity[];
  selectedDay: WeekDay;
  nowMinutes: number;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const today = todayAcademyDay();

  // Every activity gets its own dot, including two that start at the same
  // time. Stacking the second under the first made it read as a sub-step of
  // the first rather than a second thing happening at that hour.
  const sorted = [...activities].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isToday = selectedDay === today;
  const isOver = dayIsOver(selectedDay, today);

  const rows: Row[] = [];
  let nowPlaced = !isToday;
  let currentMarked = false;
  for (const activity of sorted) {
    if (!nowPlaced && toMinutes(activity.startTime) > nowMinutes) {
      rows.push({ kind: "now", key: "now" });
      nowPlaced = true;
    }
    const isPast = isOver || (isToday && toMinutes(activity.startTime) <= nowMinutes);
    // The first thing still to come today — what a parent opening the app
    // mid-morning is actually looking for.
    const isCurrent = isToday && !isPast && !currentMarked;
    if (isCurrent) currentMarked = true;
    rows.push({ kind: "activity", key: activity.id, activity, isPast, isCurrent });
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
    <View style={styles.timeline}>
      {rows.map((row, index) => {
        const line = railFor(index);
        if (row.kind === "now") {
          return <NowLine key={row.key} isRTL={isRTL} label={nowLabel} lineStyle={line} />;
        }

        const { activity, isPast, isCurrent } = row;

        return (
          <View
            key={row.key}
            style={[styles.slot, isRTL && styles.rowReverse, isCurrent && styles.slotCurrent]}
          >
            <Text
              style={[styles.time, isRTL ? styles.timeRTL : styles.timeLTR]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.3}
            >
              {formatTimeColumn(activity.startTime, t)}
            </Text>

            <View style={styles.rail}>
              {line ? <View style={[styles.railLine, line]} /> : null}
              <View
                style={[styles.dot, isPast && styles.dotPast, isCurrent && styles.dotCurrent]}
              />
            </View>

            {/* Name and duration sit at opposite ends of the row rather than
                stacked at the leading edge, so the line spans the width
                instead of hugging the rail. */}
            <View style={[styles.slotBody, isRTL && styles.rowReverse]}>
              <Text
                style={[styles.name, rtlText, styles.flex, isCurrent && styles.nameCurrent]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {activity.name}
              </Text>
              {/* Separate node, not appended to the name — a tick concatenated
                  onto an Arabic title lands on the wrong end of it. */}
              {isPast ? (
                <Text style={styles.doneCheck} maxFontSizeMultiplier={1.3}>
                  ✓
                </Text>
              ) : null}
              <Text style={styles.duration} maxFontSizeMultiplier={1.4}>
                {t.home.scheduleDuration(activity.durationMinutes)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // No card. The schedule sits directly on the page, which is what separates
  // it from the boxed sections above it — a sequence, not a collection.
  timeline: { paddingTop: 6 },
  slot: { flexDirection: "row", gap: 10 },
  // A tinted pill behind the next thing due, pulled out by its own padding so
  // the rail and the time column stay on the same grid as every other row.
  slotCurrent: {
    backgroundColor: Colors.skyTint,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  rowReverse: { flexDirection: "row-reverse" },
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
  railLineThrough: { top: 0, bottom: 0 },
  railLineFirst: { top: DOT_CENTER, bottom: 0 },
  railLineLast: { top: 0, height: DOT_CENTER },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: DOT_CENTER - 5.5,
    borderWidth: 2,
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
  },
  // Done, not disabled: the dot fills forest and the row keeps its contrast.
  dotPast: { backgroundColor: Colors.forest, borderColor: Colors.forest },
  dotCurrent: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  slotBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingBottom: 14,
  },
  flex: { flex: 1 },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bark,
    // Admin-entered content: an English activity name inside an Arabic UI has
    // to resolve its own direction, or it reads reversed.
    writingDirection: "auto",
  },
  nameCurrent: { fontFamily: Fonts.bold },
  doneCheck: { color: Colors.forest, fontSize: 13, fontFamily: Fonts.bold },
  duration: { ...Type.caption, color: Colors.textLight },
  // No alignItems and no padding of its own: the rail has to stretch the
  // full height of the row, exactly as it does on an activity row.
  nowRow: { flexDirection: "row", gap: 10 },
  nowLabel: {
    width: 78,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 20,
    color: Colors.terracotta,
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  // A solid 8px dot: at this size a ring reads as a smudge, and the marker
  // needs to be quieter than an activity's own dot, not busier.
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: DOT_CENTER - 4,
    backgroundColor: Colors.terracotta,
  },
  nowBody: { flex: 1, paddingBottom: 8 },
  nowLine: {
    height: 1,
    marginTop: DOT_CENTER - 0.5,
    backgroundColor: Colors.terracotta,
    opacity: 0.4,
  },
});
