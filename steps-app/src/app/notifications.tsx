import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { Translations } from "../i18n/translations";
import { useTranslation } from "../i18n/useTranslation";
import {
  AppNotification,
  getNotifications,
  markNotificationsRead,
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
    default:
      return t.notifications.itemAnnouncement;
  }
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
            renderItem={({ item }) => (
              <Pressable
                disabled={!item.eventId}
                onPress={() => item.eventId && router.push(`/gallery/${item.eventId}`)}
                style={({ pressed }) => [
                  styles.row,
                  isRTL && styles.rowReverse,
                  !item.read && styles.rowUnread,
                  pressed && item.eventId ? styles.rowPressed : null,
                ]}
              >
                <View style={item.read ? styles.dotSpacer : styles.unreadDot} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, rtlText]}>{itemText(item, t)}</Text>
                  <Text style={[styles.rowTime, rtlText]}>{relativeTime(item.createdAt, t)}</Text>
                </View>
                {item.eventId ? <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text> : null}
              </Pressable>
            )}
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
