import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { adminOverview } from "../../services/studentsApi";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonBlock } from "../ui/Skeleton";
import { Touchable } from "../ui/Touchable";

type Action = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  route: string;
};

/**
 * What an admin sees on Home instead of the parent's view.
 *
 * A parent's Home answers "what is my child up to?" — none of which applies
 * to the academy. This answers "what needs me today?": anything waiting on a
 * decision first, then the numbers, then one tap to the things they open most.
 */
export function AdminHomeSections() {
  const { t, isRTL, rtlText } = useTranslation();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminOverview,
  });

  const actions: Action[] = [
    {
      key: "upload",
      label: t.adminHome.actionPhotos,
      icon: "camera",
      tint: Colors.sky,
      route: "/gallery",
    },
    {
      key: "students",
      label: t.adminHome.actionStudents,
      icon: "people",
      tint: Colors.honey,
      route: "/students",
    },
    {
      key: "courses",
      label: t.adminHome.actionCourses,
      icon: "school",
      tint: Colors.forest,
      route: "/courses",
    },
    {
      key: "schedule",
      label: t.adminHome.actionSchedule,
      icon: "calendar",
      tint: Colors.clay,
      route: "/schedule",
    },
    {
      key: "feedback",
      label: t.adminHome.actionFeedback,
      icon: "chatbubble",
      tint: Colors.terracotta,
      route: "/feedback",
    },
  ];

  // Only the things genuinely waiting on the academy. An empty list is good
  // news, and says so rather than showing an empty container.
  const alerts = [
    data && data.pendingRequests > 0
      ? {
          key: "requests",
          emoji: "📋",
          text: t.adminHome.alertRequests(data.pendingRequests),
          route: "/course-requests",
          tint: Colors.clay,
        }
      : null,
    data && data.parentsAwaitingLink > 0
      ? {
          key: "awaiting",
          emoji: "👋",
          text: t.adminHome.alertAwaitingLink(data.parentsAwaitingLink),
          route: "/students",
          tint: Colors.honey,
        }
      : null,
    data && data.unreadFeedback > 0
      ? {
          key: "feedback",
          emoji: "💬",
          text: t.adminHome.alertFeedback(data.unreadFeedback),
          route: "/feedback",
          tint: Colors.forest,
        }
      : null,
    data && data.unlinkedStudents > 0
      ? {
          key: "unlinked",
          emoji: "🔗",
          text: t.adminHome.alertUnlinked(data.unlinkedStudents),
          route: "/students",
          tint: Colors.terracotta,
        }
      : null,
  ].filter(Boolean) as { key: string; emoji: string; text: string; route: string; tint: string }[];

  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, rtlText]}>{t.adminHome.needsYouTitle}</Text>

        {isPending ? (
          <View style={styles.alertsLoading}>
            <SkeletonBlock width="100%" height={58} borderRadius={16} />
            <SkeletonBlock width="100%" height={58} borderRadius={16} />
          </View>
        ) : isError || !data ? (
          <DataErrorState compact onRetry={() => void refetch()} />
        ) : alerts.length === 0 ? (
          <View style={styles.allClear}>
            <Text style={styles.allClearEmoji}>✅</Text>
            <View style={styles.flex}>
              <Text style={[styles.allClearTitle, rtlText]}>{t.adminHome.allClearTitle}</Text>
              <Text style={[styles.allClearBody, rtlText]}>{t.adminHome.allClearBody}</Text>
            </View>
          </View>
        ) : (
          alerts.map((alert) => (
            <Touchable
              key={alert.key}
              style={[styles.alert, { borderColor: alert.tint }]}
              onPress={() => router.push(alert.route as never)}
            >
              <View style={[styles.alertInner, isRTL && styles.rowReverse]}>
                <Text style={styles.alertEmoji}>{alert.emoji}</Text>
                <Text style={[styles.alertText, rtlText]}>{alert.text}</Text>
                <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text>
              </View>
            </Touchable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, rtlText]}>{t.adminHome.academyTitle}</Text>
        <View style={styles.statGrid}>
          <Stat value={data?.students} label={t.admin.statStudents} tint={Colors.terracotta} />
          <Stat value={data?.parents} label={t.admin.statParents} tint={Colors.forest} />
          <Stat value={data?.photos} label={t.admin.statPhotos} tint={Colors.sky} />
          <Stat value={data?.courses} label={t.adminHome.statCourses} tint={Colors.honey} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, rtlText]}>{t.adminHome.quickTitle}</Text>
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Touchable
              key={action.key}
              style={styles.actionTile}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.tint}22` }]}>
                <Ionicons name={action.icon} size={22} color={action.tint} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </Touchable>
          ))}
        </View>
      </View>
    </>
  );
}

function Stat({ value, label, tint }: { value?: number; label: string; tint: string }) {
  return (
    <View style={styles.statTile}>
      {value === undefined ? (
        <SkeletonBlock width={38} height={26} borderRadius={6} />
      ) : (
        <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      )}
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 12,
  },
  alertsLoading: { gap: 10 },
  alert: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  alertInner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  alertEmoji: { fontSize: 20 },
  alertText: { ...Type.body, fontSize: 14.5, fontFamily: Fonts.semiBold, color: Colors.bark, flex: 1 },
  chevron: { fontSize: 20, color: Colors.textLight },
  allClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: `${Colors.forest}14`,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${Colors.forest}55`,
    padding: 16,
  },
  allClearEmoji: { fontSize: 22 },
  allClearTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.bark },
  allClearBody: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statTile: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statValue: { fontFamily: Fonts.extraBold, fontSize: 26 },
  statLabel: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.bark,
    textAlign: "center",
  },
});
