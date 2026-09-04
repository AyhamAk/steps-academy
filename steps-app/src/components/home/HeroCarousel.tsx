import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useLayout } from "../../hooks/useLayout";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { Translations } from "../../i18n/translations";
import { NextEvent } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";
import { SlideBackdrop, SlideVariant } from "./SlideBackdrop";

const CAROUSEL_SLIDE_COUNT = 3;

/** A carousel slide: its own layered backdrop, sized to the viewport. */
function SlideBackground({
  variant,
  isRTL,
  slideWidth,
  children,
}: {
  variant: SlideVariant;
  isRTL: boolean;
  slideWidth: number;
  children: React.ReactNode;
}) {

  return (
    <SlideBackdrop
      variant={variant}
      isRTL={isRTL}
      style={[styles.carouselSlide, { width: slideWidth }]}
    >
      {children}
    </SlideBackdrop>
  );
}

export function HeroCarousel({
  t,
  isRTL,
  childName,
  nextEvent,
  daysAwayLabel,
  heroPhotoUrls,
  onToast,
  onFeedback,
}: {
  t: Translations;
  isRTL: boolean;
  childName: string | null;
  nextEvent: NextEvent | null | undefined;
  daysAwayLabel: string | null;
  heroPhotoUrls: string[];
  onToast: (message: string) => void;
  onFeedback: () => void;
}) {
  const { width, gutter } = useLayout();
  // Against the gutter, not a hardcoded 48: the card then has the same margin
  // on both sides at every width.
  const slideWidth = width - gutter * 2;
  const reduceMotion = useReduceMotionSetting();
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const dotProgress = useSharedValue(0);

  const goToIndex = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * slideWidth, animated: true });
    indexRef.current = index;
    setActiveIndex(index);
  };

  useEffect(() => {
    if (reduceMotion) return;
    dotProgress.value = 0;
    dotProgress.value = withTiming(1, { duration: 4000, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(goToIndex)((indexRef.current + 1) % CAROUSEL_SLIDE_COUNT);
    });
  }, [activeIndex, reduceMotion, slideWidth]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    indexRef.current = index;
    setActiveIndex(index);
  };

  const dotFillStyle = useAnimatedStyle(() => ({
    width: `${dotProgress.value * 100}%`,
  }));

  const childOrGeneric = childName ?? t.home.welcomeBack;
  const arrow = isRTL ? "←" : "→";
  const startAlign: "flex-start" | "flex-end" = isRTL ? "flex-end" : "flex-start";
  const textAlign: "left" | "right" = isRTL ? "right" : "left";

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        style={{ width: slideWidth }}
      >
        <SlideBackground variant="terracotta" isRTL={isRTL} slideWidth={slideWidth}>
          {/* With thumbnails there is no room for the emoji too — the strip is
              the picture, so the emoji only stands in when there are no photos. */}
          {heroPhotoUrls.length > 0 ? (
            <>
              <Text
                style={[styles.carouselHeadline, styles.headlineTight, { textAlign, alignSelf: startAlign }]}
              >
                {t.home.carouselHighlight(childOrGeneric)}
              </Text>
              <Touchable
                style={[styles.photoStrip, isRTL && styles.rowReverse, { alignSelf: startAlign }]}
                onPress={() => router.push("/gallery")}
                accessibilityLabel={t.home.carouselHighlightCta}
              >
                {heroPhotoUrls.map((url) => (
                  <Image key={url} source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
                ))}
                <Text style={styles.photoStripArrow}>{arrow}</Text>
              </Touchable>
            </>
          ) : (
            <>
              <Text style={[styles.carouselEmoji, { textAlign, alignSelf: startAlign }]}>🎨</Text>
              <Text style={[styles.carouselHeadline, { textAlign, alignSelf: startAlign }]}>
                {t.home.carouselHighlight(childOrGeneric)}
              </Text>
              <Touchable
                style={[styles.carouselCta, { alignSelf: startAlign }]}
                onPress={() => router.push("/gallery")}
              >
                <Text style={styles.carouselCtaText}>
                  {t.home.carouselHighlightCta} {arrow}
                </Text>
              </Touchable>
            </>
          )}
        </SlideBackground>

        <SlideBackground variant="forest" isRTL={isRTL} slideWidth={slideWidth}>
          <Text style={[styles.carouselEmoji, { textAlign, alignSelf: startAlign }]}>💬</Text>
          <Text style={[styles.carouselHeadline, { textAlign, alignSelf: startAlign }]}>
            {t.feedback.carouselHeadline}
          </Text>
          <Touchable
            style={[styles.carouselCta, { alignSelf: startAlign }]}
            onPress={onFeedback}
          >
            <Text style={styles.carouselCtaText}>{t.feedback.carouselCta}</Text>
          </Touchable>
        </SlideBackground>

        <SlideBackground variant="sky" isRTL={isRTL} slideWidth={slideWidth}>
          <Text style={[styles.carouselHeadline, { textAlign, alignSelf: startAlign }]}>
            {t.home.moodCheckinQuestion(childOrGeneric)}
          </Text>
          <View style={styles.moodRow}>
            {["😊", "😐", "😢"].map((moodEmoji) => (
              <Touchable
                key={moodEmoji}
                style={[styles.moodButton, selectedMood === moodEmoji && styles.moodButtonSelected]}
                onPress={() => {
                  setSelectedMood(moodEmoji);
                  onToast(t.home.moodThanks);
                }}
              >
                <Text style={styles.moodEmoji}>{moodEmoji}</Text>
              </Touchable>
            ))}
          </View>
        </SlideBackground>
      </ScrollView>

      <View style={styles.carouselDots}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.carouselDotTrack}>
            {index === activeIndex ? (
              <Animated.View
                style={[styles.carouselDotFill, reduceMotion ? { width: "100%" } : dotFillStyle]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselCta: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  carouselCtaText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  carouselEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  carouselHeadline: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 12,
    maxWidth: "80%",
  },
  carouselSlide: {
    // minHeight, not height: at a larger font scale or in Arabic the
    // headline takes a second line and a fixed 150 clipped the CTA off the
    // bottom, since the slide also clips its overflow.
    minHeight: 150,
    borderRadius: 24,
    padding: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  carouselWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  headlineTight: {
    marginBottom: 10,
  },
  moodButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  moodButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  moodEmoji: {
    fontSize: 26,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 16,
  },
  photoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoStripArrow: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#FFFFFF",
    marginHorizontal: 2,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  carouselDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  carouselDotTrack: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  carouselDotFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
