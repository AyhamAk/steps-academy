import { DevSettings, I18nManager } from "react-native";

import { Locale } from "../store/localeStore";

/**
 * This app's RTL support is entirely hand-built in JS (`rtlText`, manual
 * isRTL-conditional layout overrides throughout every screen) — that was
 * necessary because native I18nManager.forceRTL is a no-op in Expo Go,
 * where this was originally built and tested. In a real dev/production
 * build it DOES work, and its automatic mirroring fights the app's own
 * manual mirroring (e.g. a plain `flexDirection: "row"` row gets mirrored
 * twice, once by iOS/Android and once by our own styles). Keep native RTL
 * permanently disabled — Arabic/Hebrew mirroring is handled entirely by
 * the app's own locale-aware styling, never by the OS.
 *
 * Returns true if a reload was triggered (a stale native RTL flag left
 * over from a previous build/session had to be corrected).
 */
export function applyLocaleDirection(_locale: Locale): boolean {
  if (!I18nManager.isRTL) return false;

  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  DevSettings.reload();
  return true;
}
