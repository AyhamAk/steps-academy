import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { CourseRow, courseListStyles } from "../../components/courses/CourseRow";
import { CourseDetailModal } from "../../components/home/CourseDetailModal";
import { JoinCourseSheet, LeaveCourseSheet } from "../../components/home/CourseSheet";
import { Screen } from "../../components/Screen";
import { DataErrorState } from "../../components/ui/DataErrorState";
import { ScreenFadeIn } from "../../components/ui/ScreenFadeIn";
import { SkeletonCourseRow } from "../../components/ui/Skeleton";
import { StepsHeader } from "../../components/ui/StepsHeader";
import { Touchable } from "../../components/ui/Touchable";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { track } from "../../services/analytics";
import { Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { useChildren } from "../../store/authStore";
import { AGE_BANDS, AgeBand } from "../../utils/ageBand";

type Filter = "all" | "enrolled" | "open";

/**
 * The academy's own course list.
 *
 * Home shows the same rows, unfiltered, as a section. This screen exists for
 * the deliberate visit: pick an age band from the academy grid, then narrow by
 * whether your child is already in something.
 */
export default function AcademyCoursesScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const { band } = useLocalSearchParams<{ band?: string }>();
  const children = useChildren();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [joinCourse, setJoinCourse] = useState<Course | null>(null);
  const [leaving, setLeaving] = useState<{ course: Course; enrollment: MyEnrollment } | null>(null);

  // Same key as CoursesSection, so arriving here from Home is instant.
  const { data: courses, isPending, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["courses"] });

  const activeBand: AgeBand | null = band === "nursery" || band === "courses" ? band : null;

  /**
   * Age filtering only applies to courses that actually declare a range. A
   * course with no ages set belongs to the academy as a whole and is shown in
   * both bands, rather than disappearing from a screen the moment someone
   * forgets to fill the field in.
   */
  const inBand = (course: Course): boolean => {
    if (!activeBand) return true;
    if (course.ageMinYears == null && course.ageMaxYears == null) return true;
    const band = AGE_BANDS[activeBand];
    const min = course.ageMinYears ?? 0;
    const max = course.ageMaxYears ?? 99;
    return min < band.max && max > band.min;
  };

  const visible = useMemo(() => {
    const inScope = (courses ?? []).filter(inBand);
    if (filter === "enrolled") {
      return inScope.filter((course) => course.myEnrollments.length > 0);
    }
    if (filter === "open") {
      return inScope.filter((course) => course.spotsLeft === null || course.spotsLeft > 0);
    }
    return inScope;
  }, [courses, filter, activeBand]);

  // The subtitle describes what is on screen: the band's ages when one is
  // chosen, and how many courses are running in it.
  const bandRange = activeBand
    ? t.academy.ageRange(AGE_BANDS[activeBand].min, AGE_BANDS[activeBand].max)
    : null;
  const inScopeCount = (courses ?? []).filter(inBand).length;
  const subtitle = [bandRange, t.academy.runningNow(inScopeCount)].filter(Boolean).join(" · ");

  const startRequest = (course: Course) => {
    if (children.length === 0) {
      Alert.alert(t.courses.noChildrenTitle, t.courses.noChildrenMessage, [{ text: t.common.ok }]);
      return;
    }
    setJoinCourse(course);
  };

  const emptyMessage =
    filter === "enrolled"
      ? t.academy.emptyEnrolled
      : filter === "open"
        ? t.academy.emptyOpen
        : t.academy.emptyAll;

  return (
    <Screen>
      <ScreenFadeIn>
        <StepsHeader title={t.academy.coursesTitle} subtitle={subtitle} showBack />

        <View style={[styles.filters, isRTL && styles.rowReverse]}>
          {(["all", "enrolled", "open"] as Filter[]).map((key) => {
            const isActive = filter === key;
            const label =
              key === "all"
                ? t.academy.filterAll
                : key === "enrolled"
                  ? t.academy.filterEnrolled
                  : t.academy.filterOpen;
            return (
              <Touchable
                key={key}
                accessibilityLabel={label}
                style={[styles.filter, isActive && styles.filterActive]}
                onPress={() => setFilter(key)}
              >
                <Text
                  style={[styles.filterText, isActive && styles.filterTextActive]}
                  maxFontSizeMultiplier={1.3}
                >
                  {label}
                </Text>
              </Touchable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isPending ? (
            <View style={courseListStyles.list}>
              <SkeletonCourseRow />
            </View>
          ) : isError || !courses ? (
            <DataErrorState onRetry={() => void refetch()} />
          ) : visible.length === 0 ? (
            <Text style={[styles.empty, rtlText]} maxFontSizeMultiplier={1.4}>
              {emptyMessage}
            </Text>
          ) : (
            <View style={courseListStyles.list}>
              {visible.map((course, index) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  isLast={index === visible.length - 1}
                  onOpen={(c) => {
                    track("course_viewed", { course_id: c.id });
                    setDetailId(c.id);
                  }}
                  onJoin={startRequest}
                  onLeave={(c, enrollment) => setLeaving({ course: c, enrollment })}
                />
              ))}
            </View>
          )}
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
          course={(courses ?? []).find((course) => course.id === detailId) ?? null}
          isBusy={false}
          onClose={() => setDetailId(null)}
          onRequest={(course) => {
            setDetailId(null);
            startRequest(course);
          }}
          onCancel={(enrollmentId) => {
            const course = (courses ?? []).find((c) => c.id === detailId);
            const enrollment = course?.myEnrollments.find((e) => e.id === enrollmentId);
            setDetailId(null);
            if (course && enrollment) setLeaving({ course, enrollment });
          }}
        />
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  filter: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.linen,
  },
  filterActive: {
    backgroundColor: Colors.forest,
  },
  filterText: {
    ...Type.body,
    fontFamily: Fonts.semiBold,
    color: Colors.textLight,
  },
  filterTextActive: {
    color: Colors.cream,
  },
  scroll: {
    paddingBottom: 32,
  },
  empty: {
    ...Type.body,
    color: Colors.textLight,
    textAlign: "center",
    paddingVertical: 40,
  },
});
