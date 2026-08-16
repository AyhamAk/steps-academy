import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import AdminHeader from "../components/admin/AdminHeader";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { DataErrorState } from "../components/ui/DataErrorState";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { SkeletonBlock } from "../components/ui/Skeleton";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

import { faceForRating } from "../constants/FeedbackFaces";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import { FeedbackItem, listFeedback, markFeedbackRead } from "../services/feedbackApi";
import { formatRelativeTime } from "../utils/date";

function SummaryCard({ average, total }: { average: number | null; total: number }) {
  const { t, isRTL } = useTranslation();

  return (
    <View style={[styles.summary, isRTL && styles.rowReverse]}>
      <View>
        <Text style={styles.summaryValue}>
          {average === null ? "—" : average.toFixed(1)}
        </Text>
        <Text style={styles.summaryLabel}>{t.adminFeedback.averageLabel}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View>
        <Text style={styles.summaryValue}>{total}</Text>
        <Text style={styles.summaryLabel}>{t.adminFeedback.totalLabel}</Text>
      </View>
    </View>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const { t, isRTL, rtlText } = useTranslation();

  return (
    <View style={[styles.card, isRTL && styles.rowReverse]}>
      {item.rating === null ? (
        <Ionicons name="bulb-outline" size={26} color={Colors.honey} style={styles.face} />
      ) : (
        <Text style={styles.face}>{faceForRating(item.rating)}</Text>
      )}
      <View style={styles.cardBody}>
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          {/* `from` is null once an account is deleted — the feedback itself
              stays, so it needs a name to sit under. */}
          <Text style={[styles.from, rtlText]}>{item.from ?? t.adminFeedback.deletedAccount}</Text>
          <Text style={styles.when}>{formatRelativeTime(new Date(item.createdAt), t)}</Text>
        </View>
        {item.message ? (
          <Text style={[styles.message, rtlText]}>{item.message}</Text>
        ) : (
          <Text style={[styles.noMessage, rtlText]}>{t.adminFeedback.ratingOnly}</Text>
        )}
      </View>
    </View>
  );
}

export default function AdminFeedbackScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["feedback"],
    queryFn: listFeedback,
  });

  // Opening the screen is what "reading" means. Fire once, and refresh the
  // admin overview so the home alert clears with it.
  const markRead = useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
  });
  useEffect(() => {
    if (data && data.total > 0) markRead.mutate();
  }, [data?.total]);

  return (
    <Screen>
      <ScreenFadeIn>
        <AdminHeader title={t.adminFeedback.title} subtitle={t.adminFeedback.subtitle} />

        {isPending ? (
          <View style={styles.loading}>
            <SkeletonBlock width="100%" height={72} borderRadius={18} />
            <SkeletonBlock width="100%" height={92} borderRadius={18} />
            <SkeletonBlock width="100%" height={92} borderRadius={18} />
          </View>
        ) : isError || !data ? (
          <DataErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={data.feedback}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FeedbackRow item={item} />}
            ListHeaderComponent={
              data.total > 0 ? (
                <SummaryCard average={data.averageRating} total={data.total} />
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                emoji="💬"
                title={t.adminFeedback.emptyTitle}
                subtitle={t.adminFeedback.emptyBody}
              />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: 12,
    paddingTop: 8,
  },
  list: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 16,
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: Colors.border,
  },
  summaryValue: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: Colors.terracotta,
    textAlign: "center",
  },
  summaryLabel: {
    ...Type.caption,
    color: Colors.textLight,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  face: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  from: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.bark,
    flexShrink: 1,
  },
  when: {
    ...Type.caption,
    color: Colors.textLight,
  },
  message: {
    ...Type.body,
    color: Colors.text,
  },
  noMessage: {
    ...Type.caption,
    color: Colors.textLight,
    fontStyle: "italic",
  },
});
