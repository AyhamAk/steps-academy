import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    // Android draws the unread count on the launcher icon from this.
    shouldSetBadge: true,
  }),
});

/**
 * Requests permission and returns this device's Expo push token, or null if
 * unavailable (simulator, permission denied, no EAS project configured yet).
 * Never throws — a missing token just means this device won't get pushes.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    if (Platform.OS === "android") {
      // MAX, not DEFAULT: on Android, DEFAULT importance puts the notification
      // straight into the shade with no heads-up banner and no sound, so a
      // parent only finds out there are new photos if they happen to look.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Steps Academy",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E07A3A",
        sound: "default",
        showBadge: true,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Push notifications: no EAS projectId configured, skipping token registration.");
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn("Push notifications: failed to register for push token.", err);
    return null;
  }
}
