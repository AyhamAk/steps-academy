import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

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
    default:
      return t.notifications.itemAnnouncement;
  }
}

/** Icon, tint and label per type, so the kind is readable at a glance. */
const TYPE_STYLE: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; tint: string }
> = {
  photo: { icon: "images", tint: Colors.sky },
  event: { icon: "calendar", tint: Colors.honey },
  course: { icon: "school", tint: Colors.forest },
  announcement: { icon: "megaphone", tint: Colors.terracotta },
};

function typeLabel(type: NotificationType, t: Translations): string {
  return t.notifications.types[type];
}

/** Where tapping a notification should land. Null means it isn't tappable. */
function destinationFor(n: AppNotification): string | null {
  if (n.type === "course") return "/profile";
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

  return (
    <Screen>
      <ScreenFadeIn style={styles.container}>
        <StepsHeader title={t.notifications.title} showBack />

        {isError ? (
          <EmptyState emoji="⚠️" title={t.notifications.couldntLoad} subtitle={t.common.tryAgain} />
        ) : items === null ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <EmptyState emoji="🔔" title={t.notifications.empty} subtitle={t.notifications.emptySubtitle} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const destination = destinationFor(item);
              const { icon, tint } = TYPE_STYLE[item.type];
              return (
                <Touchable
                  disabled={!destination}
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
                  <View style={item.read ? styles.dotSpacer : styles.unreadDot} />
                  <View style={[styles.iconWrap, { backgroundColor: `${tint}20` }]}>
                    <Ionicons name={icon} size={18} color={tint} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.typeLabel, { color: tint }, rtlText]}>
                      {typeLabel(item.type, t)}
                    </Text>
                    <Text style={[styles.rowTitle, rtlText]}>{itemText(item, t)}</Text>
                    <Text style={[styles.rowTime, rtlText]}>{relativeTime(item.createdAt, t)}</Text>
                  </View>
                  {destination ? <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text> : null}
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
    borderColor: `${Colors.terracotta}40`,
  },
  rowPressed: {
    opacity: 0.75,
  },
  unreadDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Colors.terracotta,
  },
  dotSpacer: {
    width: DOT,
    height: DOT,
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
    color: Colors.bark,
  },
  rowTime: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textLight,
  },
});
