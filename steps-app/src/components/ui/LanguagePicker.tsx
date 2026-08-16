import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { applyLocaleDirection } from "../../i18n/applyLocaleDirection";
import { Locale, useLocaleStore } from "../../store/localeStore";
import { Touchable } from "./Touchable";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
];

/**
 * Language choice, shared by the sign-in screen and Profile. The store is
 * persisted, so picking a language before signing in carries into the app.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const select = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    applyLocaleDirection(next);
  };

  return (
    <View style={styles.row}>
      {LANGUAGES.map(({ code, label }) => {
        const isActive = locale === code;
        return (
          <Touchable
            key={code}
            onPress={() => select(code)}
            style={[
              styles.pill,
              compact && styles.pillCompact,
              isActive && styles.pillActive,
            ]}
            accessibilityLabel={label}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                compact && styles.labelCompact,
                isActive && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },  // equal thirds: label lengths differ per language
  pill: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pillCompact: { height: 36, borderRadius: 999 },
  pillActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  label: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.bark },
  labelCompact: { fontSize: 13 },
  labelActive: { color: Colors.cream },
});
