import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { useLayout } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";

type IoniconName = keyof typeof Ionicons.glyphMap;

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

const TAB_GRADIENTS: Record<string, [string, string, string]> = {
  index: [Colors.terracotta, Colors.clay, Colors.forest],
  games: [Colors.forest, Colors.sky, Colors.terracotta],
  shop: [Colors.honey, Colors.terracotta, Colors.clay],
  gallery: [Colors.sky, Colors.forest, Colors.honey],
  profile: [Colors.clay, Colors.honey, Colors.sky],
};

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

// The tab bar's top-border gradient crossfades between per-tab color triplets
// on tab switch — LinearGradient's `colors` prop isn't itself animatable, so
// this layers two gradients and animates opacity between them instead.
function TabTopBorder() {
  const segments = useSegments() as string[];
  const activeName = segments[1] ?? "index";

  const [fromColors, setFromColors] = useState(TAB_GRADIENTS[activeName] ?? TAB_GRADIENTS.index);
  const [toColors, setToColors] = useState(TAB_GRADIENTS[activeName] ?? TAB_GRADIENTS.index);
  const crossfade = useSharedValue(1);
  const prevName = useRef(activeName);

  useEffect(() => {
    if (prevName.current === activeName) return;
    setFromColors(TAB_GRADIENTS[prevName.current] ?? TAB_GRADIENTS.index);
    setToColors(TAB_GRADIENTS[activeName] ?? TAB_GRADIENTS.index);
    crossfade.value = 0;
    crossfade.value = withTiming(1, { duration: 400 });
    prevName.current = activeName;
  }, [activeName]);

  const toStyle = useAnimatedStyle(() => ({ opacity: crossfade.value }));

  return (
    <View style={styles.topBorder}>
      <LinearGradient
        colors={fromColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, toStyle]}>
        <LinearGradient
          colors={toColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
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
          borderTopColor: Colors.border,
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
            <TabTopBorder />
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
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
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
