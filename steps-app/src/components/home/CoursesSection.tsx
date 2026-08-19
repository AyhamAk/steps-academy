import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Layout } from "../../constants/Layout";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonCourseRow } from "../ui/Skeleton";
import { Touchable } from "../ui/Touchable";
import { Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { useChildren } from "../../store/authStore";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import { track } from "../../services/analytics";
import { CourseDetailModal } from "./CourseDetailModal";
import { JoinCourseSheet, LeaveCourseSheet } from "./CourseSheet";

export function CoursesSection() {
  const { t, isRTL, rtlText } = useTranslation();
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
        <Text style={[styles.sectionTitle, rtlText]}>{t.courses.sectionTitle}</Text>
        <SkeletonCourseRow />
      </View>
    );
  }
  // A failed request used to leave `courses` undefined, which looked exactly
  // like loading — the skeleton shimmered forever.
  if (isError || !courses) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, rtlText]}>{t.courses.sectionTitle}</Text>
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
      <Text style={[styles.sectionTitle, rtlText]}>{t.courses.sectionTitle}</Text>

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
            <View key={course.id} style={styles.card}>
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
                <Text style={[styles.name, rtlText]} numberOfLines={2}>
                  {course.name}
                </Text>
                {/* Fixed-height block: a course missing its days or dates leaves
                    the space blank rather than shrinking the whole card. */}
                <View style={styles.metaBlock}>
                  {formatCourseDays(course, t) ? (
                    <Text style={[styles.meta, rtlText]} numberOfLines={1}>
                      🗓 {formatCourseDays(course, t)}
                    </Text>
                  ) : null}
                  {formatCourseDates(course, t) ? (
                    <Text style={[styles.meta, rtlText]} numberOfLines={1}>
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
                  <Text style={[styles.badgeText, { color: isFull ? Colors.clay : Colors.forest }]}>
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
                  style={[styles.action, styles.actionApproved]}
                  onPress={() => setLeaving({ course, enrollment: approved })}
                >
                  <Text
                    style={styles.actionText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {t.courses.enrolled(approved.studentName)}
                  </Text>
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
    width: Layout.courseCard.width,
    height: Layout.courseCard.height,
    backgroundColor: Colors.linen,
    borderRadius: 18,
    padding: 16,
    paddingTop: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Absorbs the leftover space so the action button always sits on the bottom
  // edge, level across every card in the row.
  cardInfo: { flex: 1, marginBottom: 12 },
  metaBlock: { height: Layout.courseCard.metaBlockHeight },
  cardAccent: { position: "absolute", top: 0, start: 0, end: 0, height: 4 },
  emoji: { fontSize: 32, marginBottom: 10 },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    lineHeight: 20,
    // minHeight, not height: a fixed height cut the second line through the
    // middle of the letters. numberOfLines={2} on the element ellipsises it.
    minHeight: Layout.courseCard.nameHeight,
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
