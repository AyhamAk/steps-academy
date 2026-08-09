import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { BalloonLoader } from "../components/ui/BalloonLoader";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import {
  decideEnrollment,
  EnrollmentRequest,
  EnrollmentStatus,
  listEnrollments,
} from "../services/coursesApi";

type Filter = EnrollmentStatus | "all";

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
        {t.courses.requestedBy(request.requestedBy.name)} ·{" "}
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
              <ActivityIndicator color="#FFFFFF" />
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
  const [filter, setFilter] = useState<Filter>("pending");

  const { data, isError } = useQuery({
    queryKey: ["enrollments", filter],
    queryFn: () => listEnrollments(filter === "all" ? undefined : filter),
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "pending", label: t.courses.filterPending },
    { key: "approved", label: t.courses.filterApproved },
    { key: "rejected", label: t.courses.filterRejected },
    { key: "all", label: t.courses.filterAll },
  ];

  return (
    <Screen>
      <ScreenFadeIn style={styles.flex}>
        <StepsHeader
          title={t.courses.requestsTitle}
          subtitle={t.courses.requestsSubtitle}
          showBack
        />

        <View style={styles.filters}>
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
        </View>

        {isError ? (
          <EmptyState
            emoji="⚠️"
            title={t.courses.requestsCouldntLoad}
            subtitle={t.common.tryAgain}
          />
        ) : !data ? (
          <BalloonLoader label={t.courses.requestsLoading} />
        ) : data.enrollments.length === 0 ? (
          <EmptyState
            emoji="📋"
            title={t.courses.requestsEmpty}
            subtitle={t.courses.requestsEmptySubtitle}
          />
        ) : (
          <FlatList
            data={data.enrollments}
            keyExtractor={(request) => request.id}
            renderItem={({ item }) => <RequestCard request={item} />}
            contentContainerStyle={styles.list}
          />
        )}
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  filters: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 4 },
  filterChip: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    paddingVertical: 8,
    alignItems: "center",
  },
  filterChipActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  filterText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.textLight },
  filterTextActive: { color: "#FFFFFF" },
  list: { paddingTop: 12, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  child: { ...Type.body, fontFamily: Fonts.bold, color: Colors.bark },
  course: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: Fonts.bold, fontSize: 11 },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 8 },
  note: {
    ...Type.caption,
    color: Colors.bark,
    fontStyle: "italic",
    marginTop: 6,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  button: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  approve: { backgroundColor: Colors.forest },
  decline: { backgroundColor: Colors.cream, borderWidth: 1.5, borderColor: Colors.clay },
  buttonText: { fontFamily: Fonts.bold, fontSize: 14, color: "#FFFFFF" },
  declineText: { color: Colors.clay },
});
