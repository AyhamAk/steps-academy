import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { Translations } from "../i18n/translations";
import { track } from "../services/analytics";
import { useTranslation } from "../i18n/useTranslation";
import {
  AppNotification,
  clearNotifications,
  getNotifications,
  markNotificationsRead,
  NotificationType,
} from "../services/notificationsApi";

function relativeTime(iso: string, t: Translations): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return t.home.timeAgo.justNow;
  if (diffMin < 60) return t.home.timeAgo.minutes(diffMin);
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return t.home.timeAgo.hours(diffH);
  return t.home.timeAgo.days(Math.round(diffH / 24));
}

function itemText(n: AppNotification, t: Translations): string {
  switch (n.type) {
    case "photo":
      return t.notifications.itemPhoto(n.childName ?? "");
    case "event":
      return t.notifications.itemEvent(n.eventName ?? "");
    case "course":
      return t.notifications.itemCourse(n.childName ?? "", n.courseName ?? "");
    case "tip":
      return t.notifications.itemTip(n.tipTitle ?? "");
    default:
      return t.notifications.itemAnnouncement;
  }
}

/** Icon, tint and label per type, so the kind is readable at a glance. */
/**
 * The pale fill behind each type's icon.
 *
 * Named tokens rather than an alpha suffix on the accent, so the tile matches
 * the tinted cards elsewhere (nursery sky, tips honey) instead of being a
 * one-off computed colour.
 */
const TYPE_TILE: Record<NotificationType, string> = {
  photo: Colors.skyTint,
  announcement: Colors.clayLight,
  event: Colors.honeyLight,
  course: Colors.skyTint,
  tip: Colors.honeyLight,
};

/** Today / this week / earlier — nothing older gets its own bucket. */
function groupByRecency(items: AppNotification[]) {
  const today: AppNotification[] = [];
  const thisWeek: AppNotification[] = [];
  const earlier: AppNotification[] = [];
  const now = Date.now();
  for (const item of items) {
    const ageDays = (now - new Date(item.createdAt).getTime()) / 86_400_000;
    if (ageDays < 1) today.push(item);
    else if (ageDays < 7) thisWeek.push(item);
    else earlier.push(item);
  }
  return { today, thisWeek, earlier };
}

/**
 * One line of context under the title.
 *
 * Derived from the fields the server already sends. A per-notification body
 * would need the admin composer to exist first.
 */
function itemBody(n: AppNotification, t: Translations): string {
  switch (n.type) {
    case "photo":
      return t.notifications.bodyPhoto(n.eventName ?? null);
    case "event":
      return t.notifications.bodyEvent;
    case "course":
      return t.notifications.bodyCourse;
    case "tip":
      return t.notifications.bodyTip;
    default:
      return t.notifications.bodyAnnouncement;
  }
}

const TYPE_STYLE: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; tint: string }
> = {
  photo: { icon: "images", tint: Colors.sky },
  event: { icon: "calendar", tint: Colors.honey },
  course: { icon: "school", tint: Colors.forest },
  announcement: { icon: "megaphone", tint: Colors.terracotta },
  tip: { icon: "bulb", tint: Colors.honey },
};

function typeLabel(type: NotificationType, t: Translations): string {
  return t.notifications.types[type] ?? t.notifications.types.announcement;
}

/** Where tapping a notification should land. Null means it isn't tappable. */
function destinationFor(n: AppNotification): string | null {
  if (n.type === "course") return "/profile";
  if (n.type === "tip") return "/academy/tips";
  if (n.eventId) return `/gallery/${n.eventId}`;
  if (n.type === "announcement") return "/";
  return null;
}

export default function NotificationsScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });

  // Freeze the read/unread state from the first load so unread dots stay
  // visible while this screen is open, even though we mark everything read.
  const [snapshot, setSnapshot] = useState<AppNotification[] | null>(null);
  useEffect(() => {
    if (data && snapshot === null) setSnapshot(data.notifications);
  }, [data, snapshot]);

  // Opening the screen counts as seeing them — clear the unread badge.
  useEffect(() => {
    markNotificationsRead()
      .then((res) => queryClient.setQueryData(["notifications"], res))
      .catch(() => {});
  }, []);

  const items = snapshot ?? data?.notifications ?? null;
  const unreadCount = (items ?? []).filter((n) => !n.read).length;

  const clearMutation = useMutation({
    mutationFn: clearNotifications,
    onSuccess: () => {
      // Clear the local snapshot too: it is what this screen renders, and it
      // would otherwise keep showing the list the server no longer has.
      setSnapshot([]);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const confirmClearAll = () => {
    Alert.alert(t.notifications.clearConfirmTitle, t.notifications.clearConfirmMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.notifications.clearAll,
        style: "destructive",
        onPress: () => clearMutation.mutate(),
      },
    ]);
  };

  return (
    <Screen safeBottom>
      <ScreenFadeIn style={styles.container}>
        <StepsHeader
          title={t.notifications.title}
          subtitle={
            items && items.length > 0 ? t.notifications.unreadCount(unreadCount) : undefined
          }
          showBack
          actionLabel={items && items.length > 0 ? t.notifications.clearAll : undefined}
          onActionPress={items && items.length > 0 ? confirmClearAll : undefined}
        />

        {isError ? (
          <EmptyState emoji="⚠️" title={t.notifications.couldntLoad} subtitle={t.common.tryAgain} />
        ) : items === null ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <EmptyState emoji="🔔" title={t.notifications.empty} subtitle={t.notifications.emptySubtitle} />
        ) : (
          <FlatList
            data={
              (
                [
                  ["today", groupByRecency(items).today],
                  ["thisWeek", groupByRecency(items).thisWeek],
                  ["earlier", groupByRecency(items).earlier],
                ] as const
              ).flatMap(([key, group]) =>
                // Only a section that has something in it gets a label.
                group.length === 0
                  ? []
                  : [
                      { kind: "label" as const, key, id: `label-${key}` },
                      ...group.map((n) => ({ kind: "item" as const, id: n.id, item: n })),
                    ]
              )
            }
            keyExtractor={(row) => row.id}
            contentContainerStyle={styles.list}
            renderItem={({ item: row }) => {
              if (row.kind === "label") {
                return (
                  <Text style={[styles.sectionLabel, rtlText]} maxFontSizeMultiplier={1.3}>
                    {row.key === "today"
                      ? t.notifications.sectionToday
                      : row.key === "thisWeek"
                        ? t.notifications.sectionThisWeek
                        : t.notifications.sectionEarlier}
                  </Text>
                );
              }

              const item = row.item;
              const destination = destinationFor(item);
              // The server may know a notification type this build does not:
              // a type added after the app was installed arrives anyway, and
              // an unknown key here used to crash the whole screen.
              const { icon, tint } = TYPE_STYLE[item.type] ?? TYPE_STYLE.announcement;
              return (
                <Touchable
                  disabled={!destination}
                  accessibilityLabel={itemText(item, t)}
                  onPress={() => {
                    if (!destination) return;
                    track("notification_opened", {
                      notification_type: item.type,
                      destination,
                    });
                    router.push(destination as never);
                  }}
                  style={[styles.row, isRTL && styles.rowReverse, !item.read && styles.rowUnread]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: TYPE_TILE[item.type] ?? TYPE_TILE.announcement },
                    ]}
                  >
                    <Ionicons name={icon} size={18} color={tint} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.typeLabel, { color: tint }, rtlText]}>
                      {typeLabel(item.type, t)}
                    </Text>
                    <Text
                      style={[styles.rowTitle, !item.read && styles.rowTitleUnread, rtlText]}
                      maxFontSizeMultiplier={1.3}
                    >
                      {itemText(item, t)}
                    </Text>
                    <Text
                      style={[styles.rowBody, rtlText]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {itemBody(item, t)}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    {item.read ? null : <View style={styles.unreadDot} />}
                    <Text style={styles.rowTime} maxFontSizeMultiplier={1.2}>
                      {relativeTime(item.createdAt, t)}
                    </Text>
                  </View>
                </Touchable>
              );
            }}
          />
        )}
      </ScreenFadeIn>
    </Screen>
  );
}

const DOT = 9;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  rowUnread: {
    backgroundColor: Colors.linen,
    borderColor: Colors.terracotta,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 14,
  },
  metaCol: { alignItems: "center", gap: 6 },
  unreadDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.terracotta,
  },
  rowText: {
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  rowTitle: {
    ...Type.body,
    fontSize: 14,
    color: Colors.bark,
  },
  rowTitleUnread: {
    fontFamily: Fonts.semiBold,
  },
  rowBody: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  rowTime: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textLight,
  },
});
