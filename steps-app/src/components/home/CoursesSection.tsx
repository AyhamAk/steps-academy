import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { gridCardWidth, useLayout } from "../../hooks/useLayout";
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
import { track } from "../../services/analytics";
import { CourseDetailModal } from "./CourseDetailModal";
import { JoinCourseSheet, LeaveCourseSheet } from "./CourseSheet";

export function CoursesSection() {
  const { t, isRTL, rtlText } = useTranslation();
  const { width, gutter, cardGap, columns, isNarrow } = useLayout();
  // One column on a narrow phone. Squeezing two columns onto a 360pt screen is
  // what forced "1 Sep - 30 N..." — at full width the date simply fits.
  const cardWidth = gridCardWidth({ width, gutter, cardGap, columns });
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {courses.map((course) => {
          const isFull = course.spotsLeft !== null && course.spotsLeft === 0;
          const pending = course.myEnrollments.find((e) => e.status === "pending");
          const approved = course.myEnrollments.find((e) => e.status === "approved");
          const rejected = course.myEnrollments.find((e) => e.status === "rejected");
          // Only the card being acted on spins, not every card at once.

          return (
            <View key={course.id} style={[styles.card, { width: cardWidth }]}>
              <View
                style={[
                  styles.cardAccent,
                  { backgroundColor: course.accentColor ?? Colors.terracotta },
                ]}
              />

              <Touchable
                style={styles.cardInfo}
                onPress={() => {
                  track("course_viewed", { course_id: course.id });
                  setDetailId(course.id);
                }}
              >
                <Text style={styles.emoji}>{course.emoji}</Text>
                <Text style={[styles.name, rtlText]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                  {course.name}
                </Text>
                {/* Fixed-height block: a course missing its days or dates leaves
                    the space blank rather than shrinking the whole card. */}
                <View style={styles.metaBlock}>
                  {formatCourseDays(course, t) ? (
                    <Text style={[styles.meta, rtlText]} maxFontSizeMultiplier={1.4}>
                      🗓 {formatCourseDays(course, t)}
                    </Text>
                  ) : null}
                  {formatCourseDates(course, t) ? (
                    <Text style={[styles.meta, rtlText]} maxFontSizeMultiplier={1.4}>
                      📆 {formatCourseDates(course, t)}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isFull ? `${Colors.clay}26` : `${Colors.forest}1F` },
                    isRTL && styles.selfEnd,
                  ]}
                >
                  <Text style={[styles.badgeText, { color: isFull ? Colors.clay : Colors.forest }]} maxFontSizeMultiplier={1.4}>
                    {course.spotsLeft === null
                      ? t.courses.openToAll
                      : isFull
                        ? t.courses.full
                        : t.courses.spotsLeft(course.spotsLeft)}
                  </Text>
                </View>
              </Touchable>

              {approved ? (
                <Touchable
                  style={styles.statusRow}
                  onPress={() => setLeaving({ course, enrollment: approved })}
                >
                  {/* A status, not a call to action: a filled green button was
                      the loudest thing on the card and invited a tap that only
                      offers to undo it. */}
                  <View style={[styles.statusInner, isRTL && styles.rowReverse]}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.forest} />
                    <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
                      {t.courses.enrolled(approved.studentName)}
                    </Text>
                  </View>
                </Touchable>
              ) : pending ? (
                <Touchable
                  style={[styles.action, styles.actionPending]}
                  onPress={() => setLeaving({ course, enrollment: pending })}
                >
                  <Text
                    style={[styles.actionText, styles.actionTextPending]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {t.courses.pendingFor(pending.studentName)}
                  </Text>
                </Touchable>
              ) : (
                <Touchable
                  onPress={() => startRequest(course)}
                  style={[styles.action, isFull ? styles.actionWaitlist : styles.actionRequest]}
                >
                  <Text style={styles.actionText} numberOfLines={1}>
                    {isFull ? t.courses.joinWaitlist : t.courses.join}
                  </Text>
                </Touchable>
              )}
            </View>
          );
        })}
      </ScrollView>

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
  scroll: { gap: 12, paddingEnd: 8 },
  card: {
    // Width comes from the layout hook; height follows the content. A fixed
    // height clipped long course names and forced the meta lines to truncate.
    backgroundColor: Colors.linen,
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Absorbs the leftover space so the action button always sits on the bottom
  // edge, level across every card in the row.
  cardInfo: { flex: 1, marginBottom: 12 },
  // minHeight so a course with both a weekday and a date line can wrap
  // rather than truncate, while cards without them stay level.
  metaBlock: { minHeight: 44 },
  cardAccent: { position: "absolute", top: 0, start: 0, end: 0, height: 4 },
  emoji: { fontSize: 32, marginBottom: 10 },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    lineHeight: 20,
    minHeight: 40,
  },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 4 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: "auto",
  },
  selfEnd: { alignSelf: "flex-end" },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11 },
  action: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  actionRequest: { backgroundColor: Colors.terracotta },
  actionPending: { backgroundColor: `${Colors.honey}33`, borderWidth: 1.5, borderColor: Colors.honey },
  actionApproved: { backgroundColor: Colors.forest },
  actionWaitlist: { backgroundColor: Colors.honey },
  rowReverse: { flexDirection: "row-reverse" },
  statusRow: { minHeight: 44, justifyContent: "center" },
  statusInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: {
    flex: 1,
    minWidth: 0,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.forest,
  },
  actionText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  actionTextPending: { color: Colors.bark },
  actionTextDisabled: { color: Colors.textLight },
});
