import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Screen } from "./Screen";
import { ScreenFadeIn } from "./ui/ScreenFadeIn";
import { ToastBanner, useToast } from "./ui/Toast";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useReduceMotionSetting } from "../hooks/useReduceMotionSetting";

export type PreviewCard = { emoji: string; label: string };

type ComingSoonScreenProps = {
  heroEmoji: string;
  heading: string;
  subtext: string;
  previews: PreviewCard[];
  notifyLabel: string;
  notifyToast: string;
};

export function ComingSoonScreen({
  heroEmoji,
  heading,
  subtext,
  previews,
  notifyLabel,
  notifyToast,
}: ComingSoonScreenProps) {
  const reduceMotion = useReduceMotionSetting();
  const pulse = useSharedValue(1);
  const { message, opacity, showToast } = useToast();

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 750 }),
        withTiming(1, { duration: 750 })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Screen>
      <ScreenFadeIn style={styles.container}>
        <Animated.Text style={[styles.heroEmoji, heroStyle]}>{heroEmoji}</Animated.Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subtext}>{subtext}</Text>

        <View style={styles.previewRow}>
          {previews.map((preview) => (
            <View key={preview.label} style={styles.previewCard}>
              <Text style={styles.previewEmoji}>{preview.emoji}</Text>
              <Text style={styles.previewLabel}>{preview.label}</Text>
              <View style={styles.lockOverlay}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.notifyButton} onPress={() => showToast(notifyToast)}>
          <Text style={styles.notifyButtonText}>{notifyLabel}</Text>
        </Pressable>
      </ScreenFadeIn>

      <ToastBanner message={message} opacity={opacity} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  heroEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  heading: {
    ...Type.display,
    color: Colors.bark,
    textAlign: "center",
  },
  subtext: {
    ...Type.body,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  previewCard: {
    width: 100,
    height: 100,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewEmoji: {
    fontSize: 30,
    marginBottom: 6,
    opacity: 0.5,
  },
  previewLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
  },
  lockOverlay: {
    position: "absolute",
    top: 6,
    end: 6,
  },
  lockEmoji: {
    fontSize: 14,
  },
  notifyButton: {
    borderWidth: 1.5,
    borderColor: Colors.terracotta,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  notifyButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.terracotta,
  },
});
