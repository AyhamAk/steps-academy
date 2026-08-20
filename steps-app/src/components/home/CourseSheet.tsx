import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import {
  cancelEnrollment,
  Course,
  MyEnrollment,
  requestEnrollment,
} from "../../services/coursesApi";
import { track } from "../../services/analytics";
import { Child } from "../../store/authStore";
import { useSheetPadding } from "../../hooks/useLayout";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import { courseIcon } from "../../utils/courseIcon";
import { courseName } from "../../utils/courseText";
import IconTile from "../ui/IconTile";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

/**
 * One sheet shape for both sides of a course decision.
 *
 * Joining and leaving are the same kind of moment — a choice about a child's
 * place — so they get the same frame: the course at the top, the consequence
 * in the middle, the commitment at the bottom, and the outcome in place. Only
 * the colour of the commitment differs.
 */
function SheetShell({
  course,
  children,
  isBusy,
}: {
  course: Course;
  children: React.ReactNode;
  isBusy: boolean;
}) {
  const { t, isRTL, locale } = useTranslation();
  const sheetPadding = useSheetPadding(28);
  const accent = course.accentColor ?? Colors.terracotta;
  const meta = [formatCourseDays(course, t), formatCourseDates(course, t)]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <IconTile tint={accent} size={48}>
            <Ionicons name={courseIcon(course.emoji)} size={24} color={accent} />
          </IconTile>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={2}>
              {courseName(course, locale)}
            </Text>
            {meta ? (
              <Text style={styles.meta} numberOfLines={2}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>

        {children}

        {isBusy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={Colors.terracotta} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Result({
  icon,
  tint,
  title,
  body,
  onClose,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.centred}>
      <View style={[styles.resultBadge, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={40} color={tint} />
      </View>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultBody}>{body}</Text>
      <StepsButton label={t.common.done} onPress={onClose} style={styles.primary} />
    </View>
  );
}

/**
 * Confirming a place, from the tap to the answer, in one sheet.
 *
 * The old flow fired the request on tap and only spoke once the server had
 * replied — so the "confirmation" was really a result dialog, and the wait for
 * it looked like the app had frozen. This opens instantly with nothing but
 * local data, and the same sheet then carries the sending and finished states.
 */
export function JoinCourseSheet({
  course,
  children,
  onClose,
  onJoined,
}: {
  course: Course | null;
  children: Child[];
  onClose: () => void;
  onJoined: () => void;
}) {
  const { t, isRTL, locale } = useTranslation();
  const [childId, setChildId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ joined: boolean; childName: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!course) return;
    setChildId(children.length === 1 ? children[0].id : null);
    setOutcome(null);
    setFailed(false);
    track("course_signup_opened", { course_id: course.id });
  }, [course?.id]);

  const join = useMutation({
    mutationFn: (studentId: string) => requestEnrollment(course!.id, studentId),
    onSuccess: (enrollment) => {
      setOutcome({ joined: enrollment.status === "approved", childName: enrollment.studentName });
      track("course_signup_completed", {
        course_id: course!.id,
        waitlisted: enrollment.status !== "approved",
      });
      onJoined();
    },
    onError: () => setFailed(true),
  });

  if (!course) return null;

  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;

  const closeSheet = () => {
    if (!outcome) {
      track("course_signup_abandoned", {
        course_id: course.id,
        step: childId ? "confirm" : "select_child",
      });
    }
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={closeSheet}>
      <SheetShell course={course} isBusy={join.isPending}>
        {outcome ? (
          <Result
            icon={outcome.joined ? "checkmark-circle" : "hourglass-outline"}
            tint={outcome.joined ? Colors.forest : Colors.honey}
            title={outcome.joined ? t.courses.joinedTitle : t.courses.waitlistedTitle}
            body={
              outcome.joined
                ? t.courses.joinedMessage(outcome.childName, courseName(course, locale))
                : t.courses.waitlistedMessage(outcome.childName, courseName(course, locale))
            }
            onClose={onClose}
          />
        ) : (
          <>
            <View
              style={[
                styles.notice,
                { backgroundColor: isFull ? `${Colors.clay}1A` : `${Colors.forest}14` },
              ]}
            >
              <Text style={[styles.noticeText, { color: isFull ? Colors.clay : Colors.forest }]}>
                {course.spotsLeft === null
                  ? t.courses.openToAll
                  : isFull
                    ? t.courses.fullNote
                    : t.courses.spotsLeft(course.spotsLeft)}
              </Text>
            </View>

            {/* One child is not a choice; several are, and chips beat a stack
                of buttons in a system dialog. */}
            {children.length > 1 ? (
              <>
                <Text style={styles.label}>{t.courses.whichChildTitle}</Text>
                <View style={styles.childRow}>
                  {children.map((child) => {
                    const isSelected = child.id === childId;
                    return (
                      <Touchable
                        key={child.id}
                        onPress={() => setChildId(child.id)}
                        style={[styles.childChip, isSelected && styles.childChipSelected]}
                      >
                        <Text
                          style={[styles.childChipText, isSelected && styles.childChipTextSelected]}
                        >
                          {child.name}
                        </Text>
                      </Touchable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {failed ? <Text style={styles.error}>{t.courses.requestFailed}</Text> : null}

            <StepsButton
              label={isFull ? t.courses.joinWaitlist : t.courses.join}
              onPress={() => childId && join.mutate(childId)}
              loading={join.isPending}
              disabled={!childId}
              style={styles.primary}
            />
            <Touchable onPress={closeSheet} disabled={join.isPending} style={styles.cancel}>
              <Text style={styles.cancelText}>{t.common.cancel}</Text>
            </Touchable>
          </>
        )}
      </SheetShell>
    </Modal>
  );
}

/**
 * The same sheet for the opposite decision. Leaving used to be a stock system
 * dialog, which gave the one irreversible action on the screen less presence
 * than joining had.
 */
export function LeaveCourseSheet({
  course,
  enrollment,
  onClose,
  onLeft,
}: {
  course: Course | null;
  enrollment: MyEnrollment | null;
  onClose: () => void;
  onLeft: () => void;
}) {
  const { t, locale } = useTranslation();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enrollment) return;
    setDone(false);
    setFailed(false);
  }, [enrollment?.id]);

  const leave = useMutation({
    mutationFn: () => cancelEnrollment(enrollment!.id),
    onSuccess: () => {
      setDone(true);
      onLeft();
    },
    onError: () => setFailed(true),
  });

  if (!course || !enrollment) return null;

  const isApproved = enrollment.status === "approved";
  const confirmLabel = isApproved ? t.myCourses.leave : t.courses.leaveWaitlist;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <SheetShell course={course} isBusy={leave.isPending}>
        {done ? (
          <Result
            icon="exit-outline"
            tint={Colors.textLight}
            title={isApproved ? t.myCourses.leftTitle : t.myCourses.withdrawnTitle}
            body={
              isApproved
                ? t.myCourses.leftMessage(enrollment.studentName, courseName(course, locale))
                : t.myCourses.withdrawnMessage(enrollment.studentName, courseName(course, locale))
            }
            onClose={onClose}
          />
        ) : (
          <>
            <View style={[styles.notice, { backgroundColor: `${Colors.clay}1A` }]}>
              <Text style={[styles.noticeText, { color: Colors.clay }]}>
                {isApproved
                  ? t.myCourses.leaveMessage(enrollment.studentName, courseName(course, locale))
                  : t.myCourses.withdrawMessage(enrollment.studentName, courseName(course, locale))}
              </Text>
            </View>

            {failed ? <Text style={styles.error}>{t.myCourses.cancelFailed}</Text> : null}

            {/* Filled clay: inside a sheet the confirm must read clearly, even
                though the button that opened it is deliberately quiet. */}
            <Touchable
              onPress={() => leave.mutate()}
              disabled={leave.isPending}
              style={styles.destructive}
            >
              <Text style={styles.destructiveText}>{confirmLabel}</Text>
            </Touchable>
            <Touchable onPress={onClose} disabled={leave.isPending} style={styles.cancel}>
              <Text style={styles.cancelText}>{t.common.cancel}</Text>
            </Touchable>
          </>
        )}
      </SheetShell>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  centred: { alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.bark,
    writingDirection: "auto",
  },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
    writingDirection: "auto",
  },
  notice: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  noticeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    writingDirection: "auto",
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textLight,
    marginTop: 20,
    marginBottom: 8,
  },
  childRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  childChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  childChipSelected: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  childChipText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.bark },
  childChipTextSelected: { color: Colors.cream },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.clay,
    textAlign: "center",
    marginTop: 16,
  },
  primary: { marginTop: 20 },
  destructive: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: Colors.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.cream },
  cancel: { marginTop: 6, minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textLight },
  resultBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  resultTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.bark,
    textAlign: "center",
  },
  resultBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  busy: { position: "absolute", top: 22, end: 20 },
});
