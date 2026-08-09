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
  row: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  pillCompact: { paddingVertical: 7, borderRadius: 999 },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textLight },
  labelCompact: { fontSize: 12.5 },
  labelActive: { color: "#FFFFFF" },
});
