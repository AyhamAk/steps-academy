import { StyleSheet, Switch, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useCanSwitchView } from "../../hooks/useRole";
import { useSwitchView } from "../../hooks/useSwitchView";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuthStore } from "../../store/authStore";

/**
 * Manager ↔ parent view, next to the greeting. On means the manager view.
 * Renders nothing for anyone not on the allow-list.
 */
export function ViewToggle() {
  const { t, isRTL } = useTranslation();
  const canSwitch = useCanSwitchView();
  const viewAsParent = useAuthStore((state) => state.viewAsParent);
  const switchView = useSwitchView();

  if (!canSwitch) return null;

  return (
    <View style={[styles.row, isRTL && styles.rowReverse]}>
      <Text style={styles.label} maxFontSizeMultiplier={1.2}>
        {viewAsParent ? t.home.viewParent : t.home.viewManager}
      </Text>
      <Switch
        value={!viewAsParent}
        onValueChange={() => void switchView()}
        trackColor={{ false: Colors.border, true: Colors.sage }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.border}
        accessibilityLabel={viewAsParent ? t.profile.switchToAdmin : t.profile.switchToParent}
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowReverse: { flexDirection: "row-reverse" },
  label: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.textLight },
  // Smaller than a settings switch: it sits beside a one-line greeting.
  switch: { transform: [{ scale: 0.75 }] },
});
