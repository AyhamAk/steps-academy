import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { Colors } from "../../constants/Colors";
import { useLayout } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Height of the wave above the tab bar. */
const WAVE_HEIGHT = 6;

const TAB_ICONS: Record<string, { on: IoniconName; off: IoniconName }> = {
  index: { on: "home", off: "home-outline" },
  games: { on: "game-controller", off: "game-controller-outline" },
  shop: { on: "bag-handle", off: "bag-handle-outline" },
  gallery: { on: "images", off: "images-outline" },
  profile: { on: "person", off: "person-outline" },
};

const TAB_ORDER = ["index", "gallery", "profile"];

// Hidden for now (not deleted) — kept out of the tab bar via href: null, which
// leaves the route intact for later without making it tab-navigable.
const HIDDEN_TABS = ["games", "shop"];

function TabIcon({
  focused,
  color,
  icon,
}: {
  focused: boolean;
  color: string;
  icon: { on: IoniconName; off: IoniconName };
}) {
  const scale = useSharedValue(focused ? 1.15 : 0.85);
  const dotOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 0.85, { damping: 8, stiffness: 150 });
    dotOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  return (
    <View style={styles.iconSlot}>
      {focused ? <View style={styles.focusedPill} /> : null}
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? icon.on : icon.off} size={20} color={color} />
      </Animated.View>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
    </View>
  );
}

/**
 * The soft wave between the screen and the tab bar: sage fading to gold, a
 * few points tall. Drawn at the real width so the stroke stays even rather
 * than being stretched by a scaled viewBox.
 */
function TabWave() {
  const { width } = useWindowDimensions();
  const mid = WAVE_HEIGHT / 2;
  const d = `M0,${mid} Q${width / 4},0 ${width / 2},${mid} T${width},${mid}`;

  return (
    <View style={styles.wave} pointerEvents="none">
      <Svg width={width} height={WAVE_HEIGHT}>
        <Defs>
          <SvgGradient id="tabWave" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.85} />
            <Stop offset="1" stopColor={Colors.secondary} stopOpacity={0.85} />
          </SvgGradient>
        </Defs>
        <Path d={d} stroke="url(#tabWave)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { bottomInset } = useLayout();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.card,
          // The wave is the divider now; a hairline under it would double it.
          borderTopWidth: 0,
          // The navigation bar is added on top of the 75pt bar rather than
          // eaten out of it, so the icons keep their designed height on a
          // three-button device.
          //
          // Both lines are needed. bottom-tabs skips its own inset maths the
          // moment `height` is a number, and it spreads this style object
          // after its own `paddingBottom: insets.bottom` — so a bare 12 here
          // silently threw the inset away and left the icons under the
          // system buttons.
          height: 75 + bottomInset,
          paddingBottom: 12 + bottomInset,
          paddingTop: 6,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: Colors.card }}>
            <TabWave />
          </View>
        ),
        tabBarIcon: ({ focused, color }) => (
          <TabIcon focused={focused} color={color} icon={TAB_ICONS[route.name]} />
        ),
      })}
    >
      {TAB_ORDER.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: t.tabs[tabTitleKey(name)] }} />
      ))}
      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

function tabTitleKey(name: string): "home" | "games" | "shop" | "gallery" | "profile" {
  return name === "index" ? "home" : (name as "games" | "shop" | "gallery" | "profile");
}

const styles = StyleSheet.create({
  wave: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: WAVE_HEIGHT,
  },
  iconSlot: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  focusedPill: {
    position: "absolute",
    width: 34,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${Colors.primary}20`,
  },
  dot: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
