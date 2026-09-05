import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { Course, MyEnrollment } from "../../services/coursesApi";
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
  onLeave,
}: {
  course: Course;
  isLast: boolean;
  onOpen: (course: Course) => void;
  onJoin: (course: Course) => void;
  onLeave: (course: Course, enrollment: MyEnrollment) => void;
}) {
  const { t, isRTL, rtlText, locale } = useTranslation();

  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;
  const accent = course.accentColor ?? Colors.terracotta;
  const days = formatCourseDays(course, t);
  const dates = formatCourseDates(course, t);
  // Who is in it reads better as a line of the course's own detail than as a
  // tag competing with the button for the right-hand edge. First names only —
  // the detail view spells each child's status out in full.
  /**
   * Only a live enrolment counts.
   *
   * The API returns every enrolment ever made for this family, `rejected` and
   * `cancelled` included. Treating those as "in the course" made a row say
   * Pending for a request the academy had already turned down — while the
   * detail view, which looks for an actual pending record, offered to join.
   */
  const enrolled = course.myEnrollments.filter(
    (e) => e.status === "pending" || e.status === "approved"
  );
  const enrolledNames = enrolled.map((e) => e.studentName.split(" ")[0]).join(", ");
  // Leaving is offered only for a place the academy has actually confirmed.
  // A pending request is not a place yet, so it shows its status instead and
  // is withdrawn from the course's own detail view.
  const approved = enrolled.filter((e) => e.status === "approved");
  const isPending = approved.length === 0 && enrolled.length > 0;

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
        {enrolledNames ? (
          <MetaLine icon="person-outline" text={enrolledNames} isRTL={isRTL} />
        ) : null}
      </View>

      {/* Exactly one control per row. Joining and leaving are the only two
          things a parent does here, so the row offers whichever applies
          instead of a status tag they cannot act on. */}
      {isPending ? (
        // "Pending", not "Wait list": the request is waiting on the academy,
        // not on a place. Labelling it "Wait list" made a course with 28 free
        // places look full to the family that had asked to join it.
        <View style={styles.waitingTag}>
          <Text style={styles.waitingText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t.courses.pendingShort}
          </Text>
        </View>
      ) : approved.length > 0 ? (
        <Touchable
          onPress={() => {
            // With more than one child in the course there is no single
            // enrolment to end, so the detail view asks which.
            if (approved.length === 1) onLeave(course, approved[0]);
            else onOpen(course);
          }}
          style={[styles.actionButton, styles.leaveButton]}
          hitSlop={6}
        >
          <Text style={[styles.actionText, styles.leaveText]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t.courses.leaveShort}
          </Text>
        </Touchable>
      ) : (
        // Nested inside the row's Touchable on purpose: the row opens the
        // details, this opens the join sheet directly.
        <Touchable
          onPress={() => onJoin(course)}
          style={[styles.actionButton, isFull && styles.joinButtonWaitlist]}
          hitSlop={6}
        >
          <Text style={styles.actionText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
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
  actionButton: {
    backgroundColor: Colors.terracotta,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: "center",
    maxWidth: 110,
  },
  joinButtonWaitlist: { backgroundColor: Colors.honey },
  // Leaving is the destructive one, so it is outlined rather than filled —
  // present when you need it, never the thing your thumb lands on first.
  leaveButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.clay,
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
    textAlign: "center",
  },
  leaveText: { color: Colors.clay },
  // A pending request is a state, not an action — so it reads as a label
  // rather than borrowing the button's shape and inviting a tap.
  waitingTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${Colors.honey}33`,
    maxWidth: 110,
  },
  waitingText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.bark,
    textAlign: "center",
  },
});
