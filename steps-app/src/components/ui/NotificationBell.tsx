import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { useTranslation } from "../../i18n/useTranslation";
import { getNotifications } from "../../services/notificationsApi";
import { Touchable } from "./Touchable";

/**
 * Unread notifications, reachable from the screen the parent actually lands
 * on. It used to live only behind Profile → Notifications, which is two taps
 * away and easy to never discover.
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotionSetting();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    // Without this the count only refreshes when a screen remounts, so a
    // parent who leaves the app open never sees a new one arrive.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const unread = data?.unreadCount ?? 0;

  // The number on the launcher icon. Nothing set it before, so the badge could
  // never appear no matter what the server sent.
  useEffect(() => {
    Notifications.setBadgeCountAsync(unread).catch(() => {});
  }, [unread]);

  const swing = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || unread === 0) {
      swing.value = 0;
      return;
    }
    // A short ring every few seconds — enough to catch the eye once, not
    // enough to nag while they're reading the rest of the screen.
    swing.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.ease) }),
        withTiming(-1, { duration: 110 }),
        withTiming(1, { duration: 110 }),
        withTiming(0, { duration: 110 }),
        withTiming(0, { duration: 4000 })
      ),
      -1,
      false
    );
  }, [reduceMotion, unread]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value * 12}deg` }],
  }));

  return (
    <Touchable
      onPress={() => router.push("/notifications")}
      style={styles.button}
      hitSlop={8}
      accessibilityLabel={
        unread > 0 ? t.notifications.unreadCount(unread) : t.notifications.title
      }
    >
      <Animated.View style={bellStyle}>
        <Ionicons
          name={unread > 0 ? "notifications" : "notifications-outline"}
          size={22}
          color={unread > 0 ? Colors.terracotta : Colors.textLight}
        />
      </Animated.View>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    end: -2,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Colors.terracotta,
    borderWidth: 2,
    borderColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
  },
});
