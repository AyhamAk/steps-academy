import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { adminOverview } from "../../services/studentsApi";
import IconTile from "../admin/IconTile";
import SectionLabel from "../admin/SectionLabel";
import StatTile from "../admin/StatTile";
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
  // news, and says so rather than showing an empty container. Every one of
  // these is equally urgent, so they all get the same alert treatment.
  const alerts = [
    data && data.pendingRequests > 0
      ? {
          key: "requests",
          icon: "clipboard-outline" as const,
          text: t.adminHome.alertRequests(data.pendingRequests),
          route: "/course-requests",
        }
      : null,
    data && data.parentsAwaitingLink > 0
      ? {
          key: "awaiting",
          icon: "person-add-outline" as const,
          text: t.adminHome.alertAwaitingLink(data.parentsAwaitingLink),
          route: "/students",
        }
      : null,
    data && data.unreadFeedback > 0
      ? {
          key: "feedback",
          icon: "chatbubble-outline" as const,
          text: t.adminHome.alertFeedback(data.unreadFeedback),
          route: "/feedback",
        }
      : null,
    data && data.unlinkedStudents > 0
      ? {
          key: "unlinked",
          icon: "link-outline" as const,
          text: t.adminHome.alertUnlinked(data.unlinkedStudents),
          route: "/students",
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    route: string;
  }[];

  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <>
      <View style={styles.section}>
        <SectionLabel label={t.adminHome.needsYouTitle} />

        {isPending ? (
          <View style={styles.alertsLoading}>
            <SkeletonBlock width="100%" height={64} borderRadius={16} />
            <SkeletonBlock width="100%" height={64} borderRadius={16} />
          </View>
        ) : isError || !data ? (
          <DataErrorState compact onRetry={() => void refetch()} />
        ) : alerts.length === 0 ? (
          <View style={[styles.allClear, isRTL && styles.rowReverse]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.forest} />
            <View style={styles.flex}>
              <Text style={[styles.allClearTitle, rtlText]}>{t.adminHome.allClearTitle}</Text>
              <Text style={[styles.allClearBody, rtlText]}>{t.adminHome.allClearBody}</Text>
            </View>
          </View>
        ) : (
          alerts.map((alert) => (
            <Touchable
              key={alert.key}
              style={styles.alert}
              onPress={() => router.push(alert.route as never)}
            >
              <View style={[styles.alertInner, isRTL && styles.rowReverse]}>
                <IconTile tint={Colors.honey} size={36}>
                  <Ionicons name={alert.icon} size={18} color={Colors.honey} />
                </IconTile>
                <Text style={[styles.alertText, rtlText]} numberOfLines={2}>
                  {alert.text}
                </Text>
                <Ionicons name={chevron} size={18} color={Colors.textLight} />
              </View>
            </Touchable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel label={t.adminHome.academyTitle} />
        <View style={styles.statGrid}>
          {isPending || !data ? (
            <>
              <SkeletonBlock width="47%" height={78} borderRadius={14} />
              <SkeletonBlock width="47%" height={78} borderRadius={14} />
              <SkeletonBlock width="47%" height={78} borderRadius={14} />
              <SkeletonBlock width="47%" height={78} borderRadius={14} />
            </>
          ) : (
            <>
              <StatTile
                value={data.students}
                label={t.admin.statStudents}
                valueColor={Colors.terracotta}
              />
              <StatTile
                value={data.parents}
                label={t.admin.statParents}
                valueColor={Colors.forest}
              />
              <StatTile value={data.photos} label={t.admin.statPhotos} valueColor={Colors.sky} />
              <StatTile
                value={data.courses}
                label={t.adminHome.statCourses}
                valueColor={Colors.honey}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel label={t.adminHome.quickTitle} />
        {/* Three columns, left-aligned: five tiles read as 3 + 2 rather than
            leaving a lone full-width tile stranded on the second row. */}
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Touchable
              key={action.key}
              style={styles.actionTile}
              onPress={() => router.push(action.route as never)}
            >
              <IconTile tint={action.tint} size={36}>
                <Ionicons name={action.icon} size={18} color={action.tint} />
              </IconTile>
              <Text style={styles.actionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Touchable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  section: { marginBottom: 24 },
  alertsLoading: { gap: 10 },
  alert: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.honey,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 64,
    justifyContent: "center",
  },
  alertInner: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  alertText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.bark,
    flex: 1,
  },
  allClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  allClearTitle: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22, color: Colors.bark },
  allClearBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  actionTile: {
    flexBasis: "31%",
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  actionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.bark,
    textAlign: "center",
    marginTop: 8,
  },
});
