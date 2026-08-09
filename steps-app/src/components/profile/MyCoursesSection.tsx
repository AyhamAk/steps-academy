import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { cancelEnrollment, Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { Touchable } from "../ui/Touchable";

type Row = { course: Course; enrollment: MyEnrollment };

/**
 * Every course this parent's children are in or waiting on, with the details
 * of each — previously they could only see status on the Home cards.
 */
export function MyCoursesSection() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: listCourses });

  const cancel = useMutation({
    mutationFn: (enrollmentId: string) => cancelEnrollment(enrollmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
    onError: () =>
      Alert.alert(t.myCourses.cancelFailed, t.common.tryAgain, [{ text: t.common.ok }]),
  });

  // Only live enrolments — declined and withdrawn ones are history.
  const rows: Row[] = (courses ?? []).flatMap((course) =>
    course.myEnrollments
      .filter((e) => e.status === "pending" || e.status === "approved")
      .map((enrollment) => ({ course, enrollment }))
  );

  if (rows.length === 0) return null;

  const confirmCancel = ({ course, enrollment }: Row) => {
    const isApproved = enrollment.status === "approved";
    Alert.alert(
      isApproved ? t.myCourses.leaveTitle : t.myCourses.withdrawTitle,
      isApproved
        ? t.myCourses.leaveMessage(enrollment.studentName, course.name)
        : t.myCourses.withdrawMessage(enrollment.studentName, course.name),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: isApproved ? t.myCourses.leave : t.myCourses.withdraw,
          style: "destructive",
          onPress: () => cancel.mutate(enrollment.id),
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtlText]}>{t.myCourses.title}</Text>

      {rows.map((row) => {
        const { course, enrollment } = row;
        const isApproved = enrollment.status === "approved";
        const isCancelling = cancel.isPending && cancel.variables === enrollment.id;

        return (
          <View key={enrollment.id} style={styles.card}>
            <View
              style={[
                styles.accent,
                { backgroundColor: course.accentColor ?? Colors.terracotta },
              ]}
            />
            <View style={[styles.head, isRTL && styles.rowReverse]}>
              <Text style={styles.emoji}>{course.emoji}</Text>
              <View style={styles.flex}>
                <Text style={[styles.name, rtlText]} numberOfLines={1}>
                  {course.name}
                </Text>
                <Text style={[styles.child, rtlText]} numberOfLines={1}>
                  {enrollment.studentName}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: isApproved ? `${Colors.forest}1F` : `${Colors.honey}2E` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: isApproved ? Colors.forest : "#a2801f" },
                  ]}
                >
                  {isApproved ? t.myCourses.enrolled : t.myCourses.pending}
                </Text>
              </View>
            </View>

            {course.schedule || course.instructor ? (
              <Text style={[styles.detail, rtlText]}>
                {[course.schedule, course.instructor].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            {course.description ? (
              <Text style={[styles.detail, rtlText]} numberOfLines={2}>
                {course.description}
              </Text>
            ) : null}

            <Touchable
              style={styles.cancelButton}
              onPress={() => confirmCancel(row)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator color={Colors.clay} />
              ) : (
                <Text style={styles.cancelText}>
                  {isApproved ? t.myCourses.leave : t.myCourses.withdraw}
                </Text>
              )}
            </Touchable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    paddingStart: 18,
    marginBottom: 10,
    overflow: "hidden",
  },
  accent: { position: "absolute", top: 0, bottom: 0, start: 0, width: 5 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 26 },
  name: { ...Type.body, fontFamily: Fonts.bold, color: Colors.bark },
  child: { ...Type.caption, color: Colors.textLight, marginTop: 1 },
  statusPill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: Fonts.bold, fontSize: 11 },
  detail: { ...Type.caption, color: Colors.textLight, marginTop: 8 },
  cancelButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.clay,
    backgroundColor: Colors.cream,
  },
  cancelText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.clay },
});
