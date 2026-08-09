import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { CourseFormModal } from "../components/admin/CourseFormModal";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { BalloonLoader } from "../components/ui/BalloonLoader";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
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
        <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
          <Text style={styles.icon}>{course.emoji}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.name, rtlText]} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={[styles.meta, rtlText]} numberOfLines={1}>
            {[course.schedule, course.instructor].filter(Boolean).join(" · ") ||
              t.coursesAdmin.noSchedule}
          </Text>
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

      {/* The primary action: review this course's requests. */}
      <Touchable
        style={[styles.reviewButton, course.pendingCount > 0 && styles.reviewButtonUrgent]}
        onPress={() =>
          router.push({
            pathname: "/course-requests",
            params: { courseId: course.id, courseName: course.name },
          })
        }
      >
        <Text
          style={[
            styles.reviewText,
            course.pendingCount > 0 && styles.reviewTextUrgent,
          ]}
        >
          {course.pendingCount > 0
            ? t.coursesAdmin.reviewPending(course.pendingCount)
            : t.coursesAdmin.viewEnrolled}
        </Text>
      </Touchable>

      <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
        <Touchable style={styles.smallAction} onPress={onEdit}>
          <Text style={styles.smallActionText}>{t.coursesAdmin.edit}</Text>
        </Touchable>
        <Touchable style={styles.smallAction} onPress={onDelete} disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator color={Colors.clay} />
          ) : (
            <Text style={[styles.smallActionText, styles.deleteText]}>{t.coursesAdmin.delete}</Text>
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
        <StepsHeader title={t.coursesAdmin.title} subtitle={t.coursesAdmin.subtitle} showBack />

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
  addButton: { marginTop: 16, marginBottom: 4 },
  list: { paddingTop: 12, paddingBottom: 32, gap: 14 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    paddingTop: 20,
    overflow: "hidden",
  },
  cardInactive: { opacity: 0.62 },
  accent: { position: "absolute", top: 0, start: 0, end: 0, height: 5 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 24 },
  name: { ...Type.body, fontFamily: Fonts.bold, color: Colors.bark },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  hiddenPill: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hiddenPillText: { fontFamily: Fonts.bold, fontSize: 10.5, color: Colors.textLight },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cream,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 26, backgroundColor: Colors.border },
  statValue: { fontFamily: Fonts.extraBold, fontSize: 19 },
  statLabel: { ...Type.caption, fontSize: 11, color: Colors.textLight, marginTop: 1 },
  reviewButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  reviewButtonUrgent: {
    backgroundColor: `${Colors.honey}26`,
    borderColor: Colors.honey,
  },
  reviewText: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.textLight },
  reviewTextUrgent: { color: Colors.bark, fontFamily: Fonts.bold },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallAction: { flex: 1, alignItems: "center", paddingVertical: 8 },
  smallActionText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.terracotta },
  deleteText: { color: Colors.clay },
});
