import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonCourseRow } from "../ui/Skeleton";
import SectionLabel from "../ui/SectionLabel";
import { Touchable } from "../ui/Touchable";
import { Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { useChildren } from "../../store/authStore";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import { courseIcon } from "../../utils/courseIcon";
import { courseName } from "../../utils/courseText";
import { track } from "../../services/analytics";
import IconTile from "../ui/IconTile";
import { CourseDetailModal } from "./CourseDetailModal";
import { JoinCourseSheet, LeaveCourseSheet } from "./CourseSheet";

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

export function CoursesSection() {
  const { t, isRTL, rtlText, locale } = useTranslation();
  const children = useChildren();
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [joinCourse, setJoinCourse] = useState<Course | null>(null);
  const [leaving, setLeaving] = useState<{ course: Course; enrollment: MyEnrollment } | null>(
    null
  );

  const { data: courses, isPending, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["courses"] });

  // Still loading — show the shape of what's coming rather than nothing.
  if (isPending) {
    return (
      <View style={styles.section}>
        <SectionLabel label={t.courses.sectionTitle} />
        <SkeletonCourseRow />
      </View>
    );
  }
  // A failed request used to leave `courses` undefined, which looked exactly
  // like loading — the skeleton shimmered forever.
  if (isError || !courses) {
    return (
      <View style={styles.section}>
        <SectionLabel label={t.courses.sectionTitle} />
        <DataErrorState compact onRetry={() => void refetch()} />
      </View>
    );
  }
  if (courses.length === 0) return null;

  // Opens immediately: the sheet asks first and only then talks to the server,
  // so the tap is never waiting on a network round trip.
  const startRequest = (course: Course) => {
    if (children.length === 0) {
      Alert.alert(t.courses.noChildrenTitle, t.courses.noChildrenMessage, [{ text: t.common.ok }]);
      return;
    }
    setJoinCourse(course);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtlText]} maxFontSizeMultiplier={1.3}>{t.courses.sectionTitle}</Text>

      {/* A vertical list, not a horizontal gallery. Side-by-side cards gave
          each course ~48% of the screen for five stacked elements, which is
          what forced the meta lines to wrap and left the two cards at
          different heights. Full-width rows fit each line once and align by
          construction. */}
      <View style={styles.list}>
        {courses.map((course, index) => {
          const isFull = course.spotsLeft !== null && course.spotsLeft === 0;
          const pending = course.myEnrollments.find((e) => e.status === "pending");
          const approved = course.myEnrollments.find((e) => e.status === "approved");
          const accent = course.accentColor ?? Colors.terracotta;
          const days = formatCourseDays(course, t);
          const dates = formatCourseDates(course, t);
          // First name only: the pill has room for a tag, not a full name, and
          // the detail view lists every child's status in full.
          const firstName = (approved ?? pending)?.studentName.split(" ")[0] ?? "";

          return (
            <Touchable
              key={course.id}
              style={[
                styles.row,
                isRTL && styles.rowReverse,
                index < courses.length - 1 && styles.rowDivider,
              ]}
              onPress={() => {
                track("course_viewed", { course_id: course.id });
                setDetailId(course.id);
              }}
            >
              {/* Same 4px leading bar as the schedule rows below, so the two
                  sections read as one app rather than two. */}
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

              {/* Status is a quiet tag in the corner. Remaining places aren't
                  shown here at all — they only matter to the join decision,
                  and the detail view spells them out. */}
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
                // Nested inside the row's Touchable on purpose: the row opens
                // the details, this opens the join sheet directly.
                <Touchable
                  onPress={() => startRequest(course)}
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
        })}
      </View>

      <JoinCourseSheet
        course={joinCourse}
        children={children}
        onClose={() => setJoinCourse(null)}
        onJoined={refresh}
      />

      <LeaveCourseSheet
        course={leaving?.course ?? null}
        enrollment={leaving?.enrollment ?? null}
        onClose={() => setLeaving(null)}
        onLeft={refresh}
      />

      <CourseDetailModal
        course={courses.find((course) => course.id === detailId) ?? null}
        isBusy={false}
        onClose={() => setDetailId(null)}
        onRequest={(course) => {
          setDetailId(null);
          startRequest(course);
        }}
        onCancel={(enrollmentId) => {
          const course = courses.find((c) => c.id === detailId);
          const enrollment = course?.myEnrollments.find((e) => e.id === enrollmentId);
          setDetailId(null);
          if (course && enrollment) setLeaving({ course, enrollment });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 12,
  },
  // One surface with divided rows, matching the schedule card below it.
  list: {
    backgroundColor: Colors.linen,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
