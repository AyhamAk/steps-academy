import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useLayout } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { adminOverview, AdminOverview } from "../../services/studentsApi";
import IconTile from "../ui/IconTile";
import SectionLabel from "../ui/SectionLabel";
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
 * One row of the "Needs you" card.
 *
 * The count sits in a badge rather than inside the sentence. That is not
 * decoration: with the number in the text, the Arabic label wrapped to two
 * lines at 360dp, and a wrapped label is what made four alerts cost a whole
 * screen.
 */
function AlertRow({
  icon,
  label,
  count,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
  isLast: boolean;
}) {
  const { isRTL } = useTranslation();
  return (
    <Touchable
      accessibilityLabel={`${label} ${count}`}
      onPress={onPress}
      style={[styles.alertRow, isRTL && styles.rowReverse, isLast && styles.alertRowLast]}
    >
      <IconTile tint={Colors.honey} size={36}>
        <Ionicons name={icon} size={18} color={Colors.honey} />
      </IconTile>
      <View style={styles.alertTextWrap}>
        <Text
          style={[styles.alertLabel, isRTL && styles.textRight]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText} maxFontSizeMultiplier={1.2}>
          {count}
        </Text>
      </View>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={18}
        color={Colors.textLight}
      />
    </Touchable>
  );
}

/** One number in the academy strip. */
function Stat({ value, label, tint }: { value: number; label: string; tint: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tint }]} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * What an admin sees on Home instead of the parent's view.
 *
 * Ordered by what an admin actually does: act on what is waiting, open a tool,
 * then glance at the numbers. The stats come last because they are the one
 * section nobody acts on — they were previously the second thing on the screen.
 */
export function AdminHomeSections() {
  const { t, isRTL } = useTranslation();
  const { width, gutter, cardGap } = useLayout();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminOverview,
  });

  /**
   * Two columns, sized from the grid's *measured* width.
   *
   * Deriving it from the window width needs the container's horizontal padding,
   * which lives in `Screen` as a NativeWind class rather than in `useLayout` —
   * guessing it wrong by 8px made each tile too wide to sit two per row, so
   * every tile wrapped onto its own line. Measuring cannot drift.
   *
   * Seeded with the window width less that padding so the first frame is
   * already right, then corrected on layout.
   */
  const [gridWidth, setGridWidth] = useState(width - gutter * 2);
  const onGridLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    if (measured > 0 && measured !== gridWidth) setGridWidth(measured);
  };
  // Floored, for the reason gridCardWidth in useLayout is floored: two
  // fractional widths each round up at layout time, the pair overflows the
  // container by a pixel, and the second tile wraps — leaving one per row
  // down the whole screen.
  const tileWidth = Math.floor((gridWidth - cardGap) / 2);

  /**
   * Every admin destination that exists, so Management is somewhere an admin
   * rarely needs to open. Course requests and invite codes are here for the
   * first time: requests were reachable only through an alert, so they
   * vanished whenever nothing was pending, and invite codes were buried one
   * level inside Students.
   */
  const actions: Action[] = [
    { key: "upload", label: t.adminHome.actionPhotos, icon: "camera", tint: Colors.sky, route: "/gallery" },
    { key: "students", label: t.adminHome.actionStudents, icon: "people", tint: Colors.honey, route: "/students" },
    { key: "courses", label: t.adminHome.actionCourses, icon: "school", tint: Colors.forest, route: "/courses" },
    { key: "requests", label: t.courses.requestsTitle, icon: "clipboard", tint: Colors.clay, route: "/course-requests" },
    { key: "schedule", label: t.adminHome.actionSchedule, icon: "calendar", tint: Colors.terracotta, route: "/schedule" },
    // The tips screen has had a full editor since it shipped, but an admin
    // never sees the academy grid the parent tile lives in — so there was no
    // way to reach it. Same label and colour as that tile, so the two doors
    // lead somewhere recognisably identical.
    { key: "tips", label: t.home.tileTips, icon: "bulb", tint: Colors.honey, route: "/academy/tips" },
    { key: "invites", label: t.invite.sendTitle, icon: "key", tint: Colors.forest, route: "/invite-send" },
    { key: "feedback", label: t.adminHome.actionFeedback, icon: "chatbubble", tint: Colors.sky, route: "/feedback" },
  ];

  /**
   * Ordered by how badly the person on the other end is stuck. A parent who
   * has signed up and sees an empty app is worse off than one waiting on a
   * yes or no, and a child nobody is linked to has a whole family seeing
   * nothing at all.
   */
  const alerts = ([
    ["awaiting", "person-add-outline", t.adminHome.alertAwaitingLinkShort, "parentsAwaitingLink", "/students"],
    ["unlinked", "link-outline", t.adminHome.alertUnlinkedShort, "unlinkedStudents", "/students"],
    ["requests", "clipboard-outline", t.adminHome.alertRequestsShort, "pendingRequests", "/course-requests"],
    ["feedback", "chatbubble-outline", t.adminHome.alertFeedbackShort, "unreadFeedback", "/feedback"],
  ] as const)
    .map(([key, icon, label, field, route]) => ({
      key,
      icon: icon as keyof typeof Ionicons.glyphMap,
      label,
      count: data?.[field as keyof AdminOverview] ?? 0,
      route,
    }))
    // Nothing waiting is not worth a row, let alone a warning.
    .filter((alert) => alert.count > 0);

  return (
    <>
      <View style={styles.section}>
        <SectionLabel label={t.adminHome.needsYouTitle} />

        {isPending ? (
          <SkeletonBlock width="100%" height={120} borderRadius={16} />
        ) : isError || !data ? (
          <DataErrorState compact onRetry={() => void refetch()} />
        ) : alerts.length === 0 ? (
          // Calm, not celebratory, and deliberately not a card: an empty
          // warning box is still a warning box.
          <Text style={[styles.allClear, isRTL && styles.textRight]} maxFontSizeMultiplier={1.3}>
            {t.adminHome.allClearBody}
          </Text>
        ) : (
          // One plain card. The honey is kept for the badges alone — when four
          // things are outlined in amber at once, none of them reads as urgent.
          <View style={styles.card}>
            {alerts.map((alert, index) => (
              <AlertRow
                key={alert.key}
                icon={alert.icon}
                label={alert.label}
                count={alert.count}
                isLast={index === alerts.length - 1}
                onPress={() => router.push(alert.route as never)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel label={t.adminHome.quickTitle} />
        <View
          style={[styles.actionGrid, isRTL && styles.actionGridRTL, { gap: cardGap }]}
          onLayout={onGridLayout}
        >
          {actions.map((action) => (
            <Touchable
              key={action.key}
              accessibilityLabel={action.label}
              style={[styles.actionTile, { width: tileWidth }]}
              onPress={() => router.push(action.route as never)}
            >
              <IconTile tint={action.tint} size={40}>
                <Ionicons name={action.icon} size={21} color={action.tint} />
              </IconTile>
              <View style={styles.actionLabelWrap}>
                <Text
                  style={[styles.actionLabel, isRTL && styles.textRight]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {action.label}
                </Text>
              </View>
            </Touchable>
          ))}
        </View>

        {/* Anything not surfaced above still lives in Management. */}
        <Touchable
          accessibilityLabel={t.admin.title}
          style={styles.manageLink}
          onPress={() => router.push("/admin")}
        >
          <Text style={[styles.manageText, isRTL && styles.textRight]} maxFontSizeMultiplier={1.3}>
            {t.admin.title}
          </Text>
        </Touchable>
      </View>

      <View style={styles.section}>
        <SectionLabel label={t.adminHome.academyTitle} />
        {isPending || !data ? (
          <SkeletonBlock width="100%" height={72} borderRadius={16} />
        ) : (
          // Four numbers in one strip. They were four large tiles duplicating
          // the Management screen, two screens above the things an admin can
          // actually do something about.
          <View style={[styles.card, styles.statStrip, isRTL && styles.rowReverse]}>
            <Stat value={data.students} label={t.admin.statStudents} tint={Colors.terracotta} />
            <View style={styles.statDivider} />
            <Stat value={data.parents} label={t.admin.statParents} tint={Colors.forest} />
            <View style={styles.statDivider} />
            <Stat value={data.photos} label={t.admin.statPhotos} tint={Colors.sky} />
            <View style={styles.statDivider} />
            <Stat value={data.courses} label={t.adminHome.statCourses} tint={Colors.honey} />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  rowReverse: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },

  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },

  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  alertRowLast: { borderBottomWidth: 0 },
  alertTextWrap: { flex: 1, minWidth: 0 },
  alertLabel: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.bark },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 7,
    backgroundColor: Colors.honey,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.bark },

  allClear: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
    paddingVertical: 4,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  // RTL is driven from JS here, not by I18nManager, so `row` fills from the
  // left whatever the language. In Arabic the tiles belong on the right.
  actionGridRTL: {
    flexDirection: "row-reverse",
  },
  actionTile: {
    minHeight: 92,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: "space-between",
  },
  actionLabelWrap: { minWidth: 0, marginTop: 10 },
  actionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 21,
    color: Colors.bark,
  },
  manageLink: {
    paddingVertical: 14,
  },
  manageText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.terracotta,
  },

  statStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  stat: { flex: 1, minWidth: 0, alignItems: "center" },
  statValue: { fontFamily: Fonts.extraBold, fontSize: 18, lineHeight: 24 },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border,
  },
});
