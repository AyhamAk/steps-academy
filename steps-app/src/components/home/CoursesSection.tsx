import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { Touchable } from "../ui/Touchable";
import {
  cancelEnrollment,
  Course,
  listCourses,
  requestEnrollment,
} from "../../services/coursesApi";
import { useChildren } from "../../store/authStore";

export function CoursesSection() {
  const { t, isRTL, rtlText } = useTranslation();
  const children = useChildren();
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: listCourses });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["courses"] });

  const request = useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) =>
      requestEnrollment(courseId, studentId),
    onSuccess: (_data, variables) => {
      refresh();
      const course = courses?.find((c) => c.id === variables.courseId);
      Alert.alert(t.courses.requestSentTitle, t.courses.requestSentMessage(course?.name ?? ""), [
        { text: t.common.ok },
      ]);
    },
    onError: () => Alert.alert(t.courses.requestFailed, t.common.tryAgain, [{ text: t.common.ok }]),
  });

  const cancel = useMutation({
    mutationFn: (enrollmentId: string) => cancelEnrollment(enrollmentId),
    onSuccess: refresh,
  });

  if (!courses || courses.length === 0) return null;

  const startRequest = (course: Course) => {
    if (children.length === 0) {
      Alert.alert(t.courses.noChildrenTitle, t.courses.noChildrenMessage, [{ text: t.common.ok }]);
      return;
    }
    // With one child there's nothing to choose; with several, ask which.
    if (children.length === 1) {
      request.mutate({ courseId: course.id, studentId: children[0].id });
      return;
    }
    Alert.alert(
      t.courses.whichChildTitle,
      t.courses.whichChildMessage(course.name),
      [
        ...children.map((child) => ({
          text: child.name,
          onPress: () => request.mutate({ courseId: course.id, studentId: child.id }),
        })),
        { text: t.common.cancel, style: "cancel" as const },
      ]
    );
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
          const isRequestingThis = request.isPending && request.variables?.courseId === course.id;
          const isCancellingThis = cancel.isPending && cancel.variables === pending?.id;

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
                onPress={() =>
                  Alert.alert(course.name, course.description ?? "", [{ text: t.common.ok }])
                }
              >
                <Text style={styles.emoji}>{course.emoji}</Text>
                <Text style={[styles.name, rtlText]} numberOfLines={2}>
                  {course.name}
                </Text>
                {course.schedule ? (
                  <Text style={[styles.meta, rtlText]} numberOfLines={1}>
                    {course.schedule}
                  </Text>
                ) : null}
                {course.instructor ? (
                  <Text style={[styles.meta, rtlText]} numberOfLines={1}>
                    {t.courses.withInstructor(course.instructor)}
                  </Text>
                ) : null}

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
                <View style={[styles.action, styles.actionApproved]}>
                  <Text style={styles.actionText} numberOfLines={1}>
                    {t.courses.enrolled(approved.studentName)}
                  </Text>
                </View>
              ) : pending ? (
                <Touchable
                  style={[styles.action, styles.actionPending]}
                  onPress={() =>
                    Alert.alert(
                      t.courses.pendingTitle,
                      t.courses.pendingMessage(pending.studentName),
                      [
                        { text: t.common.cancel, style: "cancel" },
                        {
                          text: t.courses.withdraw,
                          style: "destructive",
                          onPress: () => cancel.mutate(pending.id),
                        },
                      ]
                    )
                  }
                >
                  {isCancellingThis ? (
                    <ActivityIndicator color={Colors.bark} />
                  ) : (
                    <Text style={[styles.actionText, styles.actionTextPending]} numberOfLines={1}>
                      {t.courses.pending}
                    </Text>
                  )}
                </Touchable>
              ) : (
                <Touchable
                  disabled={isFull || isRequestingThis}
                  onPress={() => startRequest(course)}
                  style={[styles.action, isFull ? styles.actionFull : styles.actionRequest]}
                >
                  {isRequestingThis ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[styles.actionText, isFull && styles.actionTextDisabled]}
                      numberOfLines={1}
                    >
                      {isFull
                        ? t.courses.full
                        : rejected
                          ? t.courses.requestAgain
                          : t.courses.request}
                    </Text>
                  )}
                </Touchable>
              )}
            </View>
          );
        })}
      </ScrollView>
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
    width: 176,
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
  cardInfo: { marginBottom: 12 },
  cardAccent: { position: "absolute", top: 0, start: 0, end: 0, height: 4 },
  emoji: { fontSize: 32, marginBottom: 10 },
  name: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.bark, lineHeight: 20 },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 4 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  selfEnd: { alignSelf: "flex-end" },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11 },
  action: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  actionRequest: { backgroundColor: Colors.terracotta },
  actionPending: { backgroundColor: `${Colors.honey}33`, borderWidth: 1.5, borderColor: Colors.honey },
  actionApproved: { backgroundColor: Colors.forest },
  actionFull: { backgroundColor: Colors.border },
  actionText: { fontFamily: Fonts.bold, fontSize: 13, color: "#FFFFFF" },
  actionTextPending: { color: Colors.bark },
  actionTextDisabled: { color: Colors.textLight },
});
