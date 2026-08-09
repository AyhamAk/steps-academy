import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import { adminOverview } from "../services/studentsApi";

function StatTile({ value, label, tint }: { value?: number; label: string; tint: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color: tint }]}>{value ?? "—"}</Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
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

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenFadeIn>
          <StepsHeader title={t.admin.title} subtitle={t.admin.subtitle} showBack />

          {/* Children with no parent linked can't see their own photos — the
              one number an admin needs to keep at zero. */}
          {data && data.unlinkedStudents > 0 ? (
            <Touchable style={styles.alert} onPress={() => router.push("/students")}>
              <Text style={styles.alertEmoji}>⚠️</Text>
              <View style={styles.flex}>
                <Text style={[styles.alertTitle, rtlText]}>
                  {t.admin.unlinkedTitle(data.unlinkedStudents)}
                </Text>
                <Text style={[styles.alertBody, rtlText]}>{t.admin.unlinkedBody}</Text>
              </View>
              <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text>
            </Touchable>
          ) : null}

          <View style={styles.tiles}>
            <StatTile value={data?.students} label={t.admin.statStudents} tint={Colors.terracotta} />
            <StatTile value={data?.parents} label={t.admin.statParents} tint={Colors.forest} />
            <StatTile value={data?.photos} label={t.admin.statPhotos} tint={Colors.sky} />
            <StatTile value={data?.events} label={t.admin.statEvents} tint={Colors.honey} />
          </View>

          <Text style={[styles.sectionTitle, rtlText]}>{t.admin.manageTitle}</Text>
          {actions.map((action) => (
            <Touchable
              key={action.key}
              style={styles.row}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.rowInner, isRTL && styles.rowReverse]}>
                <View style={[styles.iconWrap, { backgroundColor: `${action.tint}20` }]}>
                  <Ionicons name={action.icon} size={20} color={action.tint} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.rowLabel, rtlText]}>{action.label}</Text>
                  <Text style={[styles.rowHint, rtlText]}>{action.hint}</Text>
                </View>
                {action.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {action.badge > 99 ? "99+" : action.badge}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: `${Colors.honey}1F`,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.honey,
    padding: 14,
    marginTop: 16,
  },
  alertEmoji: { fontSize: 20 },
  alertTitle: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.bark },
  alertBody: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
    marginBottom: 24,
  },
  tile: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  tileValue: { fontFamily: Fonts.extraBold, fontSize: 26 },
  tileLabel: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 12,
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...Type.body, fontFamily: Fonts.semiBold, color: Colors.bark },
  rowHint: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: Colors.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12, color: "#FFFFFF" },
  chevron: { fontSize: 22, color: Colors.textLight },
});
