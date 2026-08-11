import { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** A single shimmering linen-colored placeholder rectangle. */
export function SkeletonBlock({ width, height, borderRadius = 8, style }: SkeletonBlockProps) {
  const reduceMotion = useReduceMotionSetting();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.75 : opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.linen },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Placeholder for a StepsCard-shaped event card: title + meta line + optional thumbnail strip. */
export function SkeletonEventCard({ thumbCount = 4 }: { thumbCount?: number }) {
  return (
    <View style={styles.card}>
      <SkeletonBlock width="55%" height={18} style={styles.titleGap} />
      <SkeletonBlock width="35%" height={13} style={styles.metaGap} />
      {thumbCount > 0 ? (
        <View style={styles.stripRow}>
          {Array.from({ length: thumbCount }).map((_, index) => (
            <SkeletonBlock key={index} width={72} height={72} borderRadius={12} style={styles.thumbGap} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** A stack of skeleton event cards, for gallery loading states. */
export function SkeletonEventList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonEventCard key={index} />
      ))}
    </View>
  );
}

/** Course-card shaped placeholders, matching the real horizontal card strip. */
export function SkeletonCourseRow({ count = 2 }: { count?: number }) {
  return (
    <View style={styles.courseRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.courseCard}>
          <SkeletonBlock width={34} height={34} borderRadius={10} style={styles.courseGap} />
          <SkeletonBlock width="80%" height={15} style={styles.courseGap} />
          <SkeletonBlock width="60%" height={12} style={styles.courseGap} />
          <SkeletonBlock width="45%" height={12} style={styles.courseGapWide} />
          <SkeletonBlock width="100%" height={40} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

/** Rows inside the weekly timetable card while the schedule loads. */
export function SkeletonScheduleRows({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.scheduleRow}>
          <SkeletonBlock width={4} height={36} borderRadius={2} />
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <View style={styles.scheduleText}>
            <SkeletonBlock width="55%" height={14} style={styles.courseGap} />
            <SkeletonBlock width="35%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** 3-column grid of square skeleton tiles, for a photo grid loading state. */
export function SkeletonPhotoGrid({ tileSize, count = 9 }: { tileSize: number; count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} width={tileSize} height={tileSize} borderRadius={12} style={styles.gridTile} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 16,
  },
  titleGap: {
    marginBottom: 8,
  },
  metaGap: {
    marginBottom: 12,
  },
  stripRow: {
    flexDirection: "row",
  },
  thumbGap: {
    marginEnd: 8,
  },
  courseRow: {
    flexDirection: "row",
    gap: 12,
  },
  courseCard: {
    width: 176,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  courseGap: {
    marginBottom: 8,
  },
  courseGapWide: {
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  scheduleText: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  gridTile: {
    margin: 4,
  },
});
