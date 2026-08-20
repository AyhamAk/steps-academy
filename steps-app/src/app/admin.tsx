import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AdminHeader from "../components/admin/AdminHeader";
import IconTile from "../components/ui/IconTile";
import SectionLabel from "../components/ui/SectionLabel";
import { Screen } from "../components/Screen";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import { adminOverview } from "../services/studentsApi";

/**
 * The same four numbers Home shows, compressed into one strip. Here they are
 * context, not the point of the screen — the Manage list below is.
 */
function StatStrip({
  items,
}: {
  items: { key: string; value?: number; label: string; tint: string }[];
}) {
  const { isRTL } = useTranslation();

  return (
    <View style={[styles.strip, isRTL && styles.rowReverse]}>
      {items.map((item, index) => (
        <View key={item.key} style={[styles.stripItem, index > 0 && styles.stripDivider]}>
          <Text style={[styles.stripValue, { color: item.tint }]}>{item.value ?? "—"}</Text>
          <Text style={styles.stripLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const { data } = useQuery({ queryKey: ["admin", "overview"], queryFn: adminOverview });

  const actions: {
    key: string;
    label: string;
    hint: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    route: string;
    badge?: number;
  }[] = [
    {
      key: "students",
      label: t.students.title,
      hint: t.admin.studentsHint,
      icon: "people-outline",
      tint: Colors.honey,
      route: "/students",
    },
    {
      key: "courses",
      label: t.coursesAdmin.title,
      hint: t.admin.coursesHint,
      icon: "school-outline",
      tint: Colors.forest,
      route: "/courses",
      badge: data?.pendingRequests,
    },
    {
      key: "requests",
      label: t.courses.requestsTitle,
      hint: t.admin.requestsHint,
      icon: "clipboard-outline",
      tint: Colors.clay,
      route: "/course-requests",
    },
    {
      key: "schedule",
      label: t.scheduleAdmin.title,
      hint: t.admin.scheduleHint,
      icon: "calendar-outline",
      tint: Colors.honey,
      route: "/schedule",
    },
    {
      key: "gallery",
      label: t.admin.galleryLabel,
      hint: t.admin.galleryHint,
      icon: "images-outline",
      tint: Colors.sky,
      route: "/gallery",
    },
  ];

  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <Screen safeBottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenFadeIn>
          <AdminHeader title={t.admin.title} subtitle={t.admin.subtitle} />

          {/* Children with no parent linked cannot see their own photos — the
              one number an admin needs to keep at zero. */}
          {data && data.unlinkedStudents > 0 ? (
            <Touchable style={styles.alert} onPress={() => router.push("/students")}>
              <View style={[styles.alertInner, isRTL && styles.rowReverse]}>
                <Ionicons name="warning-outline" size={20} color={Colors.textLight} />
                <View style={styles.flex}>
                  <Text style={[styles.alertTitle, rtlText]}>
                    {t.admin.unlinkedTitle(data.unlinkedStudents)}
                  </Text>
                  <Text style={[styles.alertBody, rtlText]}>{t.admin.unlinkedBody}</Text>
                </View>
                <Ionicons name={chevron} size={18} color={Colors.textLight} />
              </View>
            </Touchable>
          ) : null}

          <StatStrip
            items={[
              {
                key: "students",
                value: data?.students,
                label: t.admin.statStudents,
                tint: Colors.terracotta,
              },
              {
                key: "parents",
                value: data?.parents,
                label: t.admin.statParents,
                tint: Colors.forest,
              },
              { key: "photos", value: data?.photos, label: t.admin.statPhotos, tint: Colors.sky },
              { key: "events", value: data?.events, label: t.admin.statEvents, tint: Colors.honey },
            ]}
          />

          <SectionLabel label={t.admin.manageTitle} />

          {actions.map((action) => (
            <Touchable
              key={action.key}
              style={styles.row}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.rowInner, isRTL && styles.rowReverse]}>
                <IconTile tint={action.tint} size={40}>
                  <Ionicons name={action.icon} size={20} color={action.tint} />
                </IconTile>
                <View style={styles.flex}>
                  <Text style={[styles.rowLabel, rtlText]}>{action.label}</Text>
                  <Text style={[styles.rowHint, rtlText]} numberOfLines={1}>
                    {action.hint}
                  </Text>
                </View>
                {action.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{action.badge > 99 ? "99+" : action.badge}</Text>
                  </View>
                ) : null}
                <Ionicons name={chevron} size={18} color={Colors.textLight} />
              </View>
            </Touchable>
          ))}
        </ScreenFadeIn>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  alert: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.honey,
    padding: 16,
    marginTop: 8,
  },
  alertInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  alertTitle: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 22, color: Colors.bark },
  alertBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 12,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripDivider: { borderStartWidth: 1, borderStartColor: Colors.border },
  stripValue: { fontFamily: Fonts.extraBold, fontSize: 18, lineHeight: 24 },
  stripLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textLight,
    marginTop: 2,
  },
  row: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 22, color: Colors.bark },
  rowHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: Colors.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.cream },
});
