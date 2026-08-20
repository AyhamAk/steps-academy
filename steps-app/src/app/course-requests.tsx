import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AdminHeader from "../components/admin/AdminHeader";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { SkeletonCardList } from "../components/ui/Skeleton";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import {
  decideEnrollment,
  EnrollmentRequest,
  EnrollmentStatus,
  listEnrollments,
} from "../services/coursesApi";

type Filter = EnrollmentStatus | "all";

/**
 * One section per course, courses with the most requests first — an admin
 * reviewing a full class wants them together, not interleaved by date.
 */
function groupByCourse(requests: EnrollmentRequest[]) {
  const byCourse = new Map<string, { title: string; data: EnrollmentRequest[] }>();
  for (const request of requests) {
    const section = byCourse.get(request.courseId);
    if (section) {
      section.data.push(request);
    } else {
      byCourse.set(request.courseId, { title: request.courseName, data: [request] });
    }
  }
  return [...byCourse.values()].sort((a, b) => b.data.length - a.data.length);
}

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  pending: Colors.honey,
  approved: Colors.forest,
  rejected: Colors.clay,
  cancelled: Colors.textLight,
};

function RequestCard({ request }: { request: EnrollmentRequest }) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();

  const statusLabel: Record<EnrollmentStatus, string> = {
    pending: t.courses.statusPending,
    approved: t.courses.statusApproved,
    rejected: t.courses.statusRejected,
    cancelled: t.courses.statusCancelled,
  };

  const decide = useMutation({
    mutationFn: (status: "approved" | "rejected") => decideEnrollment(request.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enrollments"] }),
    onError: (error: { response?: { data?: { message?: string } } }) =>
      Alert.alert(
        t.courses.requestsCouldntLoad,
        error?.response?.data?.message ?? t.common.tryAgain,
        [{ text: t.common.ok }]
      ),
  });

  const decidedDate = request.decidedAt ? new Date(request.decidedAt).toLocaleDateString() : null;

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
        <View style={styles.flex}>
          <Text style={[styles.child, rtlText]}>{request.studentName}</Text>
          <Text style={[styles.course, rtlText]}>{request.courseName}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[request.status]}26` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[request.status] }]}>
            {statusLabel[request.status]}
          </Text>
        </View>
      </View>

      <Text style={[styles.meta, rtlText]}>
        {t.courses.requestedBy(request.requestedBy?.name ?? t.adminFeedback.deletedAccount)} ·{" "}
        {new Date(request.requestedAt).toLocaleDateString()}
      </Text>
      {request.decidedBy && decidedDate ? (
        <Text style={[styles.meta, rtlText]}>
          {statusLabel[request.status]} {t.courses.decidedBy(request.decidedBy.name)} · {decidedDate}
        </Text>
      ) : null}
      {request.note ? <Text style={[styles.note, rtlText]}>“{request.note}”</Text> : null}

      {request.status === "pending" ? (
        <View style={[styles.actions, isRTL && styles.rowReverse]}>
          <Touchable
            style={[styles.button, styles.decline]}
            disabled={decide.isPending}
            onPress={() => decide.mutate("rejected")}
          >
            {decide.isPending && decide.variables === "rejected" ? (
              <ActivityIndicator color={Colors.clay} />
            ) : (
              <Text style={[styles.buttonText, styles.declineText]}>{t.courses.decline}</Text>
            )}
          </Touchable>
          <Touchable
            style={[styles.button, styles.approve]}
            disabled={decide.isPending}
            onPress={() => decide.mutate("approved")}
          >
            {decide.isPending && decide.variables === "approved" ? (
              <ActivityIndicator color={Colors.cream} />
            ) : (
              <Text style={styles.buttonText}>{t.courses.approve}</Text>
            )}
          </Touchable>
        </View>
      ) : null}
    </View>
  );
}

export default function CourseRequestsScreen() {
  const { t } = useTranslation();
  // Arrives with a course when opened from a course card, empty from the
  // dashboard — the same board serves both.
  const { courseId, courseName } = useLocalSearchParams<{
    courseId?: string;
    courseName?: string;
  }>();
  const [filter, setFilter] = useState<Filter>("pending");

  const { data, isError } = useQuery({
    queryKey: ["enrollments", filter, courseId ?? "all-courses"],
    queryFn: () =>
      listEnrollments({ status: filter === "all" ? undefined : filter, courseId }),
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "pending", label: t.courses.filterPending },
    { key: "approved", label: t.courses.filterApproved },
    { key: "rejected", label: t.courses.filterRejected },
    { key: "all", label: t.courses.filterAll },
  ];

  return (
    <Screen safeBottom>
      <ScreenFadeIn style={styles.flex}>
        <AdminHeader
          title={courseName ?? t.courses.requestsTitle}
          subtitle={courseName ? t.courses.requestsForCourse : t.courses.requestsSubtitle}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
        >
          {filters.map((item) => {
            const isActive = item.key === filter;
            const showBadge = item.key === "pending" && (data?.pendingCount ?? 0) > 0;
            return (
              <Touchable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.label}
                  {showBadge ? ` (${data?.pendingCount})` : ""}
                </Text>
              </Touchable>
            );
          })}
        </ScrollView>

        {isError ? (
          <EmptyState
            emoji="⚠️"
            title={t.courses.requestsCouldntLoad}
            subtitle={t.common.tryAgain}
          />
        ) : !data ? (
          <SkeletonCardList count={4} height={132} />
        ) : data.enrollments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {t.courses.requestsEmptyFor(filters.find((f) => f.key === filter)?.label ?? "")}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={groupByCourse(data.enrollments)}
            keyExtractor={(request) => request.id}
            renderItem={({ item }) => <RequestCard request={item} />}
            // Course headers are redundant when already filtered to one course.
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, courseId ? styles.hidden : null]}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {section.title}
                </Text>
                <View
                  style={[
                    styles.sectionCount,
                    filter === "pending" && section.data.length > 0 && styles.sectionCountUrgent,
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionCountText,
                      filter === "pending" && section.data.length > 0 && styles.sectionCountTextUrgent,
                    ]}
                  >
                    {section.data.length}
                  </Text>
                </View>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.list}
            removeClippedSubviews
            initialNumToRender={10}
          />
        )}
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  filtersScroll: { flexGrow: 0, marginTop: 8, marginBottom: 4 },
  filters: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  filterChip: {
    height: 40,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    paddingHorizontal: 18,
  },
  filterChipActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  filterText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textLight },
  filterTextActive: { color: Colors.cream },
  list: { paddingTop: 12, paddingBottom: 32 },
  empty: { paddingVertical: 48, alignItems: "center" },
  emptyText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textLight, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: Colors.cream,
    paddingVertical: 10,
    marginTop: 8,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.bark,
  },
  sectionCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCountUrgent: { backgroundColor: Colors.honey, borderColor: Colors.honey },
  sectionCountText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.textLight },
  sectionCountTextUrgent: { color: Colors.bark },
  hidden: { height: 0, paddingVertical: 0, marginTop: 0, opacity: 0 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  child: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, color: Colors.bark },
  course: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.textLight, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  meta: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16, color: Colors.textLight, marginTop: 8 },
  note: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.bark,
    fontStyle: "italic",
    marginTop: 8,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: { flex: 1, borderRadius: 12, minHeight: 44, justifyContent: "center", alignItems: "center" },
  approve: { backgroundColor: Colors.forest },
  decline: { backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.clay },
  buttonText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.cream },
  declineText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.clay },
});
