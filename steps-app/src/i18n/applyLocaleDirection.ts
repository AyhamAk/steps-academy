import { DevSettings, I18nManager } from "react-native";

import { isRTLLocale, Locale } from "../store/localeStore";

/**
 * RTL only takes effect after a full native-view reload — I18nManager.forceRTL
 * just sets the flag for next time. DevSettings.reload() is the dev/Expo Go
 * equivalent of a restart; a standalone build would use expo-updates'
 * Updates.reloadAsync() instead.
 *
 * Returns true if a reload was triggered (direction actually changed).
 */
export function applyLocaleDirection(locale: Locale): boolean {
  const desiredRTL = isRTLLocale(locale);
  if (I18nManager.isRTL === desiredRTL) return false;

  I18nManager.allowRTL(desiredRTL);
  I18nManager.forceRTL(desiredRTL);
  DevSettings.reload();
  return true;
}
