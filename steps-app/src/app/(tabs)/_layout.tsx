import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { useTranslation } from "../../i18n/useTranslation";

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { on: IoniconName; off: IoniconName }> = {
  index: { on: "home", off: "home-outline" },
  games: { on: "game-controller", off: "game-controller-outline" },
  shop: { on: "bag-handle", off: "bag-handle-outline" },
  gallery: { on: "images", off: "images-outline" },
  profile: { on: "person", off: "person-outline" },
};

const TAB_ORDER = ["index", "games", "shop", "gallery", "profile"];

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
    <View style={focused ? styles.focusedPill : undefined}>
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? icon.on : icon.off} size={22} color={color} />
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

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          height: 75,
          paddingBottom: 12,
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
  focusedPill: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
