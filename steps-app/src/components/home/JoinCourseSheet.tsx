import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Course, requestEnrollment } from "../../services/coursesApi";
import { Child } from "../../store/authStore";
import { formatCourseDates, formatCourseDays } from "../../utils/courseSchedule";
import IconTile from "../admin/IconTile";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

type Outcome = { joined: boolean; childName: string };

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
  const { t, isRTL, rtlText } = useTranslation();
  const [childId, setChildId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!course) return;
    setChildId(children.length === 1 ? children[0].id : null);
    setOutcome(null);
    setFailed(false);
  }, [course?.id]);

  const join = useMutation({
    mutationFn: (studentId: string) => requestEnrollment(course!.id, studentId),
    onSuccess: (enrollment) => {
      setOutcome({ joined: enrollment.status === "approved", childName: enrollment.studentName });
      onJoined();
    },
    onError: () => setFailed(true),
  });

  if (!course) return null;

  const isFull = course.spotsLeft !== null && course.spotsLeft === 0;
  const accent = course.accentColor ?? Colors.terracotta;
  const meta = [formatCourseDays(course, t), formatCourseDates(course, t)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {outcome ? (
            <View style={styles.centred}>
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: outcome.joined ? `${Colors.forest}22` : `${Colors.honey}22` },
                ]}
              >
                <Ionicons
                  name={outcome.joined ? "checkmark-circle" : "hourglass-outline"}
                  size={40}
                  color={outcome.joined ? Colors.forest : Colors.honey}
                />
              </View>
              <Text style={styles.resultTitle}>
                {outcome.joined ? t.courses.joinedTitle : t.courses.waitlistedTitle}
              </Text>
              <Text style={[styles.resultBody, rtlText]}>
                {outcome.joined
                  ? t.courses.joinedMessage(outcome.childName, course.name)
                  : t.courses.waitlistedMessage(outcome.childName, course.name)}
              </Text>
              <StepsButton label={t.common.done} onPress={onClose} style={styles.primary} />
            </View>
          ) : (
            <>
              <View style={[styles.header, isRTL && styles.rowReverse]}>
                <IconTile tint={accent} size={48}>
                  <Text style={styles.emoji}>{course.emoji}</Text>
                </IconTile>
                <View style={styles.flex}>
                  <Text style={[styles.name, rtlText]} numberOfLines={2}>
                    {course.name}
                  </Text>
                  {meta ? (
                    <Text style={[styles.meta, rtlText]} numberOfLines={2}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.spots,
                  { backgroundColor: isFull ? `${Colors.clay}1A` : `${Colors.forest}14` },
                ]}
              >
                <Text style={[styles.spotsText, { color: isFull ? Colors.clay : Colors.forest }]}>
                  {course.spotsLeft === null
                    ? t.courses.openToAll
                    : isFull
                      ? t.courses.fullNote
                      : t.courses.spotsLeft(course.spotsLeft)}
                </Text>
              </View>

              {/* One child needs no choice; several do, and chips beat a stack
                  of buttons in a system dialog. */}
              {children.length > 1 ? (
                <>
                  <Text style={[styles.label, rtlText]}>{t.courses.whichChildTitle}</Text>
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
              <Touchable onPress={onClose} disabled={join.isPending} style={styles.cancel}>
                <Text style={styles.cancelText}>{t.common.cancel}</Text>
              </Touchable>
            </>
          )}

          {join.isPending ? (
            <View style={styles.sending}>
              <ActivityIndicator color={Colors.terracotta} />
            </View>
          ) : null}
        </View>
      </View>
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
    paddingBottom: 28,
  },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  centred: { alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  emoji: { fontSize: 26 },
  name: { fontFamily: Fonts.extraBold, fontSize: 20, lineHeight: 26, color: Colors.bark },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  spots: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  spotsText: { fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 19, textAlign: "center" },
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
  cancel: { marginTop: 6, minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textLight },
  resultBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
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
  sending: { position: "absolute", top: 22, end: 20 },
});
