import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { gridCardWidth, useLayout } from "../../hooks/useLayout";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * A single linen placeholder with a light band sweeping across it.
 *
 * The previous version only breathed its opacity, which on a warm palette was
 * easy to mistake for a rendered-but-empty box. A travelling highlight reads as
 * "working on it" at a glance, which is the whole job of a skeleton.
 *
 * The sweep needs a real pixel width to travel across, so it stays idle until
 * onLayout reports one — percentage widths would otherwise animate nothing.
 */
export function SkeletonBlock({ width, height, borderRadius = 8, style }: SkeletonBlockProps) {
  const reduceMotion = useReduceMotionSetting();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || measuredWidth === 0) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [reduceMotion, measuredWidth]);

  const sweepStyle = useAnimatedStyle(() => ({
    // Starts fully off the leading edge and ends fully off the trailing one.
    transform: [{ translateX: -measuredWidth + progress.value * (measuredWidth * 2) }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== measuredWidth) setMeasuredWidth(next);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.block,
        { width, height, borderRadius, backgroundColor: Colors.linen },
        reduceMotion && styles.blockStill,
        style,
      ]}
    >
      {reduceMotion || measuredWidth === 0 ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
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
  // Same maths as the real cards, so placeholders sit exactly where the
  // content will land instead of jumping when it arrives.
  const { width, gutter, cardGap, columns } = useLayout();
  const cardWidth = gridCardWidth({ width, gutter, cardGap, columns });

  return (
    <View style={styles.courseRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.courseCard, { width: cardWidth }]}>
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
export function SkeletonPhotoGrid({
  tileSize,
  count = 9,
  style,
}: {
  tileSize: number;
  count?: number;
  /** Lets the caller bleed the grid past a screen's padding, so placeholders
   *  land exactly where the real tiles will. */
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.grid, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} width={tileSize} height={tileSize} borderRadius={14} />
      ))}
    </View>
  );
}

/**
 * A stack of card-shaped placeholders, sized to whatever the screen's own cards
 * are. Screens used to show a generic loader here, which told you something was
 * happening but not what was coming; this holds the page's shape while it does.
 */
export function SkeletonCardList({
  count = 4,
  height = 76,
  borderRadius = 16,
}: {
  count?: number;
  height?: number;
  borderRadius?: number;
}) {
  return (
    <View style={styles.cardList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} width="100%" height={height} borderRadius={borderRadius} />
      ))}
    </View>
  );
}

/**
 * The whole Home body in placeholder form: hero, courses strip, timetable and
 * announcement. Home holds this until every one of its queries has landed, so
 * the page arrives in one piece instead of four sections popping in
 * independently as each request finishes.
 */
export function SkeletonHomeSections({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <View>
      {isAdmin ? (
        <View style={styles.adminBlock}>
          <SkeletonBlock width="100%" height={58} borderRadius={16} style={styles.courseGap} />
          <SkeletonBlock width="100%" height={58} borderRadius={16} />
        </View>
      ) : (
        <>
          <SkeletonBlock width="100%" height={190} borderRadius={20} style={styles.heroGap} />
          <View style={styles.sectionHeader}>
            <SkeletonBlock width="42%" height={17} />
          </View>
          <SkeletonCourseRow />
        </>
      )}

      <View style={styles.sectionHeader}>
        <SkeletonBlock width="38%" height={17} />
      </View>
      <View style={styles.card}>
        <SkeletonScheduleRows count={3} />
      </View>

      <View style={styles.sectionHeader}>
        <SkeletonBlock width="46%" height={17} />
      </View>
      <SkeletonEventCard thumbCount={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardList: {
    gap: 12,
    paddingTop: 12,
  },
  block: {
    overflow: "hidden",
  },
  blockStill: {
    opacity: 0.75,
  },
  heroGap: {
    marginTop: 16,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  adminBlock: {
    marginTop: 16,
  },
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
    // Width is computed per device at the call site; minHeight keeps the row
    // stable without clipping the content that replaces it.
    minHeight: 240,
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
    gap: 8,
    marginTop: 16,
  },
});
