import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { Course } from "../../services/coursesApi";
import { courseIcon } from "../../utils/courseIcon";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import { courseName } from "../../utils/courseText";
import IconTile from "../ui/IconTile";
import { Touchable } from "../ui/Touchable";

/**
 * One line of course meta, led by a vector icon.
 *
 * These used to be 🗓/📆 glyphs inline in the text — two different calendar
 * emoji for the same kind of information, rendered differently on every
 * platform and out of step with the Ionicons everywhere else.
 */
function MetaLine({
  icon,
  text,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  isRTL: boolean;
}) {
  return (
    <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
      <Ionicons name={icon} size={13} color={Colors.textLight} />
      <Text
        style={[styles.meta, isRTL && styles.metaRTL]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.4}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * A single course, as it appears everywhere courses are listed.
 *
 * Extracted from the Home section so the academy's own Courses screen renders
 * identical rows — two hand-maintained copies of this markup would have drifted
 * the first time a pill changed.
 */
export function CourseRow({
  course,
  isLast,
  onOpen,
  onJoin,
}: {
  course: Course;
  isLast: boolean;
  onOpen: (course: Course) => void;
  onJoin: (course: Course) => void;
}) {
  const { t, isRTL, rtlText, locale } = useTranslation();

  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;
  const pending = course.myEnrollments.find((e) => e.status === "pending");
  const approved = course.myEnrollments.find((e) => e.status === "approved");
  const accent = course.accentColor ?? Colors.terracotta;
  const days = formatCourseDays(course, t);
  const dates = formatCourseDates(course, t);
  // First name only: the pill has room for a tag, not a full name, and the
  // detail view lists every child's status in full.
  const firstName = (approved ?? pending)?.studentName.split(" ")[0] ?? "";

  return (
    <Touchable
      style={[styles.row, isRTL && styles.rowReverse, !isLast && styles.rowDivider]}
      onPress={() => onOpen(course)}
    >
      {/* Same 4px leading bar as the schedule rows, so the two sections read as
          one app rather than two. */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <IconTile tint={accent} size={40}>
        <Ionicons name={courseIcon(course.emoji)} size={20} color={accent} />
      </IconTile>

      <View style={styles.info}>
        <Text style={[styles.name, rtlText]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {courseName(course, locale)}
        </Text>
        {days ? <MetaLine icon="time-outline" text={days} isRTL={isRTL} /> : null}
        {dates ? <MetaLine icon="calendar-outline" text={dates} isRTL={isRTL} /> : null}
      </View>

      {/* Status is a quiet tag in the corner. Remaining places aren't shown
          here at all — they only matter to the join decision, and the detail
          view spells them out. */}
      {approved ? (
        <View style={[styles.pill, styles.pillEnrolled, isRTL && styles.rowReverse]}>
          <Ionicons name="checkmark-circle" size={13} color={Colors.forest} />
          <Text style={[styles.pillText, styles.pillTextEnrolled]} numberOfLines={1}>
            {firstName || t.myCourses.enrolled}
          </Text>
        </View>
      ) : pending ? (
        <View style={[styles.pill, styles.pillPending, isRTL && styles.rowReverse]}>
          <Ionicons name="hourglass-outline" size={13} color={Colors.bark} />
          <Text style={[styles.pillText, styles.pillTextPending]} numberOfLines={1}>
            {firstName || t.myCourses.waitlisted}
          </Text>
        </View>
      ) : (
        // Nested inside the row's Touchable on purpose: the row opens the
        // details, this opens the join sheet directly.
        <Touchable
          onPress={() => onJoin(course)}
          style={[styles.joinButton, isFull && styles.joinButtonWaitlist]}
          hitSlop={6}
        >
          <Text style={styles.joinText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {isFull ? t.courses.waitlistShort : t.courses.joinShort}
          </Text>
        </Touchable>
      )}

      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={18}
        color={Colors.textLight}
      />
    </Touchable>
  );
}

/** The surface the rows sit on. Shared so both screens get the same card. */
export const courseListStyles = StyleSheet.create({
  list: {
    backgroundColor: Colors.linen,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 72,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowReverse: { flexDirection: "row-reverse" },
  accentBar: { width: 4, height: 40, borderRadius: 2 },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bark,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  // numberOfLines keeps each meta line to one line; flex lets it use the full
  // row width before ellipsising, which at full width it rarely reaches.
  meta: { ...Type.caption, color: Colors.textLight, flex: 1, writingDirection: "auto" },
  metaRTL: { textAlign: "right" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 110,
  },
  pillEnrolled: { backgroundColor: `${Colors.forest}1F` },
  pillPending: { backgroundColor: `${Colors.honey}33` },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 12, flexShrink: 1 },
  pillTextEnrolled: { color: Colors.forest },
  pillTextPending: { color: Colors.bark },
  joinButton: {
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: "center",
    maxWidth: 110,
  },
  joinButtonWaitlist: { backgroundColor: Colors.honey },
  joinText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
    textAlign: "center",
  },
});
