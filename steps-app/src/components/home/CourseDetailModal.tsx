import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { Course } from "../../services/coursesApi";
import { formatCourseDates, formatCourseDays, hasCourseEnded } from "../../utils/courseSchedule";
import { courseIcon } from "../../utils/courseIcon";
import { courseDescription, courseName } from "../../utils/courseText";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

type CourseDetailModalProps = {
  course: Course | null;
  isBusy: boolean;
  onClose: () => void;
  onRequest: (course: Course) => void;
  onCancel: (enrollmentId: string, isApproved: boolean) => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { isRTL, rtlText } = useTranslation();
  return (
    <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
      <Ionicons name={icon} size={18} color={Colors.textLight} style={styles.detailIcon} />
      <View style={styles.flex}>
        <Text style={[styles.detailLabel, rtlText]}>{label}</Text>
        <Text style={[styles.detailValue, rtlText]}>{value}</Text>
      </View>
    </View>
  );
}

/**
 * Everything about one course. The cards stay scannable and this carries the
 * detail — an Alert couldn't show structured schedule and date information.
 */
export function CourseDetailModal({
  course,
  isBusy,
  onClose,
  onRequest,
  onCancel,
}: CourseDetailModalProps) {
  const { t, isRTL, rtlText, locale } = useTranslation();
  if (!course) return null;

  const accent = course.accentColor ?? Colors.terracotta;
  const days = formatCourseDays(course, t);
  const dates = formatCourseDates(course, t);
  const ended = hasCourseEnded(course);
  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;

  const pending = course.myEnrollments.find((e) => e.status === "pending");
  const approved = course.myEnrollments.find((e) => e.status === "approved");

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={[styles.accent, { backgroundColor: accent }]} />

          <View style={[styles.header, isRTL && styles.rowReverse]}>
            <View style={[styles.iconBubble, { backgroundColor: `${accent}22` }]}>
              <Ionicons name={courseIcon(course.emoji)} size={24} color={accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.title, rtlText]}>{courseName(course, locale)}</Text>
              {course.instructor ? (
                <Text style={[styles.instructor, rtlText]}>
                  {t.courses.withInstructor(course.instructor)}
                </Text>
              ) : null}
            </View>
            <Touchable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {courseDescription(course, locale) ? (
              <Text style={[styles.description, rtlText]}>
                {courseDescription(course, locale)}
              </Text>
            ) : null}

            <View style={styles.details}>
              {days ? (
                <DetailRow icon="time-outline" label={t.courses.detailDays} value={days} />
              ) : null}
              {dates ? (
                <DetailRow icon="calendar-outline" label={t.courses.detailDates} value={dates} />
              ) : null}
              <DetailRow
                icon="people-outline"
                label={t.courses.detailPlaces}
                value={
                  course.spotsLeft === null
                    ? t.courses.openToAll
                    : t.courses.placesOf(course.approvedCount, course.capacity)
                }
              />
            </View>

            {/* Status per child, since a parent may have several. */}
            {course.myEnrollments.length > 0 ? (
              <View style={styles.statusBlock}>
                {course.myEnrollments
                  .filter((e) => e.status === "pending" || e.status === "approved")
                  .map((enrollment) => (
                    <View
                      key={enrollment.id}
                      style={[
                        styles.statusRow,
                        isRTL && styles.rowReverse,
                        {
                          backgroundColor:
                            enrollment.status === "approved"
                              ? `${Colors.forest}1A`
                              : `${Colors.honey}26`,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, rtlText]}>
                        {enrollment.status === "approved"
                          ? t.courses.enrolled(enrollment.studentName)
                          : t.courses.waitlistedFor(enrollment.studentName)}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {ended ? (
              <Text style={styles.endedNote}>{t.courses.ended}</Text>
            ) : approved ? (
              <StepsButton
                label={t.myCourses.leave}
                variant="outline"
                loading={isBusy}
                onPress={() => onCancel(approved.id, true)}
              />
            ) : pending ? (
              <StepsButton
                label={t.myCourses.withdraw}
                variant="outline"
                loading={isBusy}
                onPress={() => onCancel(pending.id, false)}
              />
            ) : (
              <>
                <StepsButton
                  label={isFull ? t.courses.joinWaitlist : t.courses.join}
                  loading={isBusy}
                  onPress={() => onRequest(course)}
                />
                {isFull ? <Text style={styles.fullNote}>{t.courses.fullNote}</Text> : null}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
    maxHeight: "82%",
    overflow: "hidden",
  },
  accent: { position: "absolute", top: 0, start: 0, end: 0, height: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 19, color: Colors.bark },
  instructor: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  close: { fontSize: 20, color: Colors.textLight },
  body: { marginTop: 18 },
  description: { ...Type.body, fontSize: 14.5, color: Colors.bark, lineHeight: 21 },
  details: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailIcon: { width: 24, textAlign: "center" },
  detailLabel: {
    ...Type.caption,
    fontSize: 11,
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: Colors.bark, marginTop: 1 },
  statusBlock: { marginTop: 14, gap: 8 },
  statusRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.bark },
  actions: { marginTop: 18 },
  fullNote: {
    ...Type.caption,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 10,
  },
  endedNote: { ...Type.caption, color: Colors.textLight, textAlign: "center", paddingVertical: 12 },
});
