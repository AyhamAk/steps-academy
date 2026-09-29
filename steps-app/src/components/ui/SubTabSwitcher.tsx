import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Touchable } from "./Touchable";

type SubTabSwitcherProps = {
  tabs: [string, string];
  activeIndex: 0 | 1;
  onChange: (index: 0 | 1) => void;
};

/**
 * Two tabs inside one screen: Schedule / Photos on the nursery, Courses /
 * Photos on courses, Nursery / Courses in the gallery. The first tab sits on
 * the reading side, so it moves to the right in Arabic and Hebrew.
 */
export function SubTabSwitcher({
  tabs,
  activeIndex,
  onChange,
}: SubTabSwitcherProps) {
  const { isRTL } = useTranslation();

  return (
    <View style={[styles.track, isRTL && styles.rowReverse]}>
      {tabs.map((label, index) => {
        const isActive = index === activeIndex;
        return (
          <Touchable
            key={label}
            accessibilityLabel={label}
            onPress={() => onChange(index as 0 | 1)}
            hitSlop={4}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              maxFontSizeMultiplier={1.3}
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
  track: {
    flexDirection: "row",
    backgroundColor: Colors.linen,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  rowReverse: { flexDirection: "row-reverse" },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  tabActive: { backgroundColor: Colors.cream },
  tabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
  },
  tabTextActive: { color: Colors.terracotta },
});
