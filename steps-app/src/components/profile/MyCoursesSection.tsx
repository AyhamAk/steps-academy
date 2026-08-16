import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { cancelEnrollment, Course, listCourses, MyEnrollment } from "../../services/coursesApi";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import IconTile from "../ui/IconTile";
import SectionLabel from "../ui/SectionLabel";
import { Touchable } from "../ui/Touchable";

type Row = { course: Course; enrollment: MyEnrollment };

/**
 * A meta line whose parts each resolve their own direction.
 *
 * Joining "الأحد · Sarah" into one string lets the bidi algorithm reorder the
 * whole line around the strongest run, which put the separator in the wrong
 * place for mixed Arabic/English courses. Separate Text nodes keep each part
 * independent.
 */
function MetaRow({
  icon,
  parts,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  parts: (string | null | undefined)[];
}) {
  const { isRTL } = useTranslation();
  const visible = parts.filter((part): part is string => !!part);
  if (visible.length === 0) return null;

  return (
    <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
      <Ionicons name={icon} size={14} color={Colors.textLight} style={styles.metaIcon} />
      <View style={[styles.metaParts, isRTL && styles.rowReverse]}>
        {visible.map((part, index) => (
          <View key={`${part}-${index}`} style={[styles.metaParts, isRTL && styles.rowReverse]}>
            {index > 0 ? <Text style={styles.metaSeparator}>·</Text> : null}
            <Text style={styles.meta}>{part}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Every course this parent's children are in or waiting on, with the details
 * of each — previously they could only see status on the Home cards.
 */
export function MyCoursesSection() {
  const { t, isRTL } = useTranslation();
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
          text: isApproved ? t.myCourses.leave : t.courses.leaveWaitlist,
          style: "destructive",
          onPress: () => cancel.mutate(enrollment.id),
        },
      ]
    );
  };

  return (
    <View>
      <SectionLabel label={t.myCourses.title} />

      {rows.map((row) => {
        const { course, enrollment } = row;
        const isApproved = enrollment.status === "approved";
        const isCancelling = cancel.isPending && cancel.variables === enrollment.id;
        const accent = course.accentColor ?? Colors.terracotta;

        return (
          <View key={enrollment.id} style={styles.card}>
            {/* Bar and body sit in a row, so the bar can never overrun the
                card's rounded corner the way an absolute one did. */}
            <View style={styles.cardRow}>
              <View style={[styles.accent, { backgroundColor: accent }]} />
              <View style={styles.body}>
                <View style={[styles.head, isRTL && styles.rowReverse]}>
                  <IconTile tint={accent} size={44}>
                    <Text style={styles.emoji}>{course.emoji}</Text>
                  </IconTile>
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {course.name}
                    </Text>
                    <Text style={styles.child} numberOfLines={1}>
                      {enrollment.studentName}
                    </Text>
                  </View>
                  {/* Everything here is enrolled or waiting; only the exception
                      is worth a badge. */}
                  {isApproved ? null : (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{t.myCourses.waitlisted}</Text>
                    </View>
                  )}
                </View>

                <MetaRow
                  icon="calendar-outline"
                  parts={[formatCourseDays(course, t), course.instructor ?? ""]}
                />
                <MetaRow icon="calendar-outline" parts={[formatCourseDates(course, t)]} />

                {course.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {course.description}
                  </Text>
                ) : null}

                <View style={[styles.footer, isRTL && styles.rowReverse]}>
                  <Touchable
                    style={styles.leaveButton}
                    onPress={() => confirmCancel(row)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator color={Colors.clay} />
                    ) : (
                      <Text style={styles.leaveText}>
                        {isApproved ? t.myCourses.leave : t.courses.leaveWaitlist}
                      </Text>
                    )}
                  </Touchable>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardRow: { flexDirection: "row" },
  accent: { width: 4 },
  body: { flex: 1, padding: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 24 },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.bark,
    writingDirection: "auto",
  },
  child: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
    writingDirection: "auto",
  },
  statusPill: {
    backgroundColor: `${Colors.honey}2E`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 12, lineHeight: 16, color: Colors.bark },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaIcon: { width: 20 },
  metaParts: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    writingDirection: "auto",
  },
  metaSeparator: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    paddingHorizontal: 6,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 8,
    writingDirection: "auto",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 12,
  },
  leaveButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  leaveText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.clay },
});
