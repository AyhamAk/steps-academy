import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";

import AdminHeader from "../components/admin/AdminHeader";
import { CourseFormModal } from "../components/admin/CourseFormModal";
import IconTile from "../components/admin/IconTile";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { BalloonLoader } from "../components/ui/BalloonLoader";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import { formatCourseDates, formatCourseDays } from "../utils/courseSchedule";
import {
  Course,
  CourseInput,
  createCourse,
  deleteCourse,
  listCourses,
  updateCourse,
} from "../services/coursesApi";

function CourseCard({
  course,
  onEdit,
  onDelete,
  isDeleting,
}: {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const accent = course.accentColor ?? Colors.terracotta;
  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;

  return (
    <View style={[styles.card, !course.isActive && styles.cardInactive]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />

      <View style={[styles.cardHead, isRTL && styles.rowReverse]}>
        <IconTile tint={accent} size={44}>
          <Text style={styles.icon}>{course.emoji}</Text>
        </IconTile>
        <View style={styles.flex}>
          <Text style={[styles.name, rtlText]} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={[styles.meta, rtlText]} numberOfLines={1}>
            {[formatCourseDays(course, t), course.instructor].filter(Boolean).join(" · ") ||
              t.coursesAdmin.noSchedule}
          </Text>
          {formatCourseDates(course, t) ? (
            <View style={[styles.dateRow, isRTL && styles.rowReverse]}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
              <Text style={[styles.meta, styles.dateText, rtlText]} numberOfLines={1}>
                {formatCourseDates(course, t)}
              </Text>
            </View>
          ) : null}
        </View>
        {!course.isActive ? (
          <View style={styles.hiddenPill}>
            <Text style={styles.hiddenPillText}>{t.coursesAdmin.hidden}</Text>
          </View>
        ) : null}
      </View>

      {/* Enrolment at a glance: filled places, free places, and anything waiting. */}
      <View style={[styles.statRow, isRTL && styles.rowReverse]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.forest }]}>{course.approvedCount}</Text>
          <Text style={styles.statLabel}>{t.coursesAdmin.statEnrolled}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: isFull ? Colors.clay : Colors.bark }]}>
            {course.spotsLeft === null ? "∞" : course.spotsLeft}
          </Text>
          <Text style={styles.statLabel}>{t.coursesAdmin.statSpots}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text
            style={[
              styles.statValue,
              { color: course.pendingCount > 0 ? Colors.honey : Colors.textLight },
            ]}
          >
            {course.pendingCount}
          </Text>
          <Text style={styles.statLabel}>{t.coursesAdmin.statPending}</Text>
        </View>
      </View>

      {/* The primary action: review this course's requests. A row rather than a
          boxed button, so it doesn't compete with the card's own outline. */}
      <Touchable
        style={styles.reviewRow}
        onPress={() =>
          router.push({
            pathname: "/course-requests",
            params: { courseId: course.id, courseName: course.name },
          })
        }
      >
        <View style={[styles.reviewInner, isRTL && styles.rowReverse]}>
          <Text style={[styles.reviewText, course.pendingCount > 0 && styles.reviewTextUrgent]}>
            {course.pendingCount > 0
              ? t.coursesAdmin.reviewPending(course.pendingCount)
              : t.coursesAdmin.viewEnrolled}
          </Text>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={18}
            color={Colors.textLight}
          />
        </View>
      </Touchable>

      <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
        <Touchable style={styles.action} onPress={onEdit}>
          <Text style={styles.editText}>{t.coursesAdmin.edit}</Text>
        </Touchable>
        <Touchable style={styles.action} onPress={onDelete} disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator color={Colors.clay} />
          ) : (
            <Text style={styles.deleteText}>{t.coursesAdmin.delete}</Text>
          )}
        </Touchable>
      </View>
    </View>
  );
}

export default function CoursesAdminScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const { data: courses, isError } = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["courses"] });

  const save = useMutation({
    mutationFn: (input: CourseInput) =>
      editing ? updateCourse(editing.id, input) : createCourse(input),
    onSuccess: () => {
      refresh();
      setIsFormOpen(false);
      setEditing(null);
    },
    onError: () =>
      Alert.alert(t.coursesAdmin.saveFailed, t.common.tryAgain, [{ text: t.common.ok }]),
  });

  const remove = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: refresh,
  });

  const confirmDelete = (course: Course) =>
    Alert.alert(t.coursesAdmin.deleteTitle, t.coursesAdmin.deleteMessage(course.name), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.coursesAdmin.delete,
        style: "destructive",
        onPress: () => remove.mutate(course.id),
      },
    ]);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setIsFormOpen(true);
  };

  return (
    <Screen>
      <ScreenFadeIn style={styles.flex}>
        <AdminHeader title={t.coursesAdmin.title} subtitle={t.coursesAdmin.subtitle} />

        <StepsButton
          label={t.coursesAdmin.addCourse}
          onPress={openCreate}
          style={styles.addButton}
        />

        {isError ? (
          <EmptyState emoji="⚠️" title={t.coursesAdmin.couldntLoad} subtitle={t.common.tryAgain} />
        ) : !courses ? (
          <BalloonLoader label={t.coursesAdmin.loading} />
        ) : courses.length === 0 ? (
          <EmptyState
            emoji="🎓"
            title={t.coursesAdmin.empty}
            subtitle={t.coursesAdmin.emptySubtitle}
          />
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(course) => course.id}
            renderItem={({ item }) => (
              <CourseCard
                course={item}
                onEdit={() => openEdit(item)}
                onDelete={() => confirmDelete(item)}
                isDeleting={remove.isPending && remove.variables === item.id}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenFadeIn>

      <CourseFormModal
        visible={isFormOpen}
        course={editing}
        isSaving={save.isPending}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => save.mutate(input)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  addButton: { marginTop: 8, marginBottom: 4 },
  list: { paddingTop: 12, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    paddingTop: 20,
    overflow: "hidden",
  },
  cardInactive: { opacity: 0.62 },
  // Rounded to match the card, so the bar no longer squares off its corners.
  accent: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 24 },
  name: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, color: Colors.bark },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  dateText: { marginTop: 0 },
  hiddenPill: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hiddenPillText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.textLight },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 12,
  },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 26, backgroundColor: Colors.border },
  statValue: { fontFamily: Fonts.extraBold, fontSize: 20, lineHeight: 26 },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textLight,
    marginTop: 1,
  },
  reviewRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reviewInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    minHeight: 44,
  },
  reviewText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.terracotta },
  reviewTextUrgent: { color: Colors.bark },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  action: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  editText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.terracotta },
  deleteText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.clay },
});
