import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonCourseRow } from "../ui/Skeleton";
import SectionLabel from "../ui/SectionLabel";
import { Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { useChildren } from "../../store/authStore";
import { track } from "../../services/analytics";
import { CourseRow, courseListStyles } from "../courses/CourseRow";
import { CourseDetailModal } from "./CourseDetailModal";
import { JoinCourseSheet, LeaveCourseSheet } from "./CourseSheet";

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
      <View style={courseListStyles.list}>
        {courses.map((course, index) => (
          <CourseRow
            key={course.id}
            course={course}
            isLast={index === courses.length - 1}
            onOpen={(c) => {
              track("course_viewed", { course_id: c.id });
              setDetailId(c.id);
            }}
            onJoin={startRequest}
          />
        ))}
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
});
