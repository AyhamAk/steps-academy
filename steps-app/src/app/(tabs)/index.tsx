import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { CoursesSection } from "../../components/home/CoursesSection";
import { WeeklyScheduleSection } from "../../components/home/WeeklyScheduleSection";
import { Screen } from "../../components/Screen";
import { StepsButton } from "../../components/ui/StepsButton";
import { StepsCard } from "../../components/ui/StepsCard";
import { SkeletonEventCard } from "../../components/ui/Skeleton";
import { StepsLogo } from "../../components/ui/StepsLogo";
import { ToastBanner, useToast } from "../../components/ui/Toast";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { Translations } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
import { Announcement, createAnnouncement, getLatestAnnouncement } from "../../services/announcementsApi";
import {
  getNextEvent,
  isPhotoTaggedWithAny,
  myGallery,
  NextEvent,
  resolvePhotoUrl,
} from "../../services/galleryApi";
import { useAuthStore } from "../../store/authStore";
import { formatIsoDate, parseIsoDate } from "../../utils/date";
import { Touchable } from "../../components/ui/Touchable";

type SalutationKey = "goodMorning" | "goodAfternoon" | "goodEvening" | "goodNight";

function getTimeOfDayGreeting(): { salutationKey: SalutationKey; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { salutationKey: "goodMorning", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { salutationKey: "goodAfternoon", emoji: "🌻" };
  if (hour >= 17 && hour < 21) return { salutationKey: "goodEvening", emoji: "🌙" };
  return { salutationKey: "goodNight", emoji: "⭐" };
}

function getFirstName(fullName: string | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

function getDaysAway(date: Date, t: Translations): { label: string; isToday: boolean } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfEventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return { label: t.home.today, isToday: true };
  return { label: t.home.daysAway(diffDays), isToday: false };
}

function formatRelativeTime(date: Date, t: Translations): string {
  const diffMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return t.home.timeAgo.justNow;
  if (diffMinutes < 60) return t.home.timeAgo.minutes(diffMinutes);
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t.home.timeAgo.hours(diffHours);
  const diffDays = Math.round(diffHours / 24);
  return t.home.timeAgo.days(diffDays);
}

const CAROUSEL_SLIDE_COUNT = 3;

function HeroCarousel({
  t,
  isRTL,
  childName,
  nextEvent,
  daysAwayLabel,
  heroPhotoUrl,
  onToast,
}: {
  t: Translations;
  isRTL: boolean;
  childName: string | null;
  nextEvent: NextEvent | null | undefined;
  daysAwayLabel: string | null;
  heroPhotoUrl: string | null;
  onToast: (message: string) => void;
}) {
  const { width } = useWindowDimensions();
  const slideWidth = width - 48;
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
        style={{ width: slideWidth }}
      >
        <LinearGradient
          colors={[Colors.terracotta, Colors.clay]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.carouselSlide, { width: slideWidth }]}
        >
          {heroPhotoUrl ? (
            <>
              <Image
                source={{ uri: heroPhotoUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <View style={[StyleSheet.absoluteFill, styles.heroOverlay]} />
            </>
          ) : null}
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
        </LinearGradient>

        <View style={[styles.carouselSlide, { width: slideWidth, backgroundColor: Colors.forest }]}>
          <Text style={[styles.carouselEmoji, { textAlign, alignSelf: startAlign }]}>🎪</Text>
          <Text style={[styles.carouselHeadline, { textAlign, alignSelf: startAlign }]}>
            {nextEvent && daysAwayLabel
              ? t.home.carouselCountdown(nextEvent.name, daysAwayLabel)
              : t.home.carouselNoEvent}
          </Text>
          <Touchable
            style={[styles.carouselCta, { alignSelf: startAlign }]}
            onPress={() => onToast(t.common.comingSoon)}
          >
            <Text style={styles.carouselCtaText}>{t.home.addToCalendar}</Text>
          </Touchable>
        </View>

        <LinearGradient
          colors={[Colors.sky, Colors.forest]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.carouselSlide, { width: slideWidth }]}
        >
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
        </LinearGradient>
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

function AnnouncementQuickAddModal({
  visible,
  onClose,
  onCreated,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (announcement: Announcement) => void;
  t: Translations;
}) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!text.trim()) {
      setError(t.home.announcementRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const announcement = await createAnnouncement(text.trim());
      onCreated(announcement);
      setText("");
    } catch {
      setError(t.home.couldntPostAnnouncement);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.home.addAnnouncement}</Text>
            <Touchable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Touchable>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t.home.announcementPlaceholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.modalInput, styles.modalTextArea]}
            multiline
          />

          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          <StepsButton
            label={isSaving ? t.home.posting : t.home.postAnnouncement}
            onPress={handlePost}
            style={styles.modalButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChildStrip({ children }: { children: { id: string; name: string }[] }) {
  if (children.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.childStrip}
    >
      {children.map((child) => (
        <View key={child.id} style={styles.childChip}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarEmoji}>🐘</Text>
          </View>
          <Text style={styles.childChipName}>{child.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ExpandableAnnouncementText({
  text,
  expanded,
  rtlText,
}: {
  text: string;
  expanded: boolean;
  rtlText: Pick<TextStyle, "textAlign" | "writingDirection">;
}) {
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const heightProgress = useSharedValue(0);
  const reduceMotion = useReduceMotionSetting();

  useEffect(() => {
    if (collapsedHeight == null || fullHeight == null) return;
    heightProgress.value = reduceMotion
      ? expanded
        ? 1
        : 0
      : withTiming(expanded ? 1 : 0, { duration: 250 });
  }, [expanded, collapsedHeight, fullHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    if (collapsedHeight == null || fullHeight == null) return {};
    return {
      height: interpolate(
        heightProgress.value,
        [0, 1],
        [collapsedHeight, fullHeight],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <View>
      <Text
        style={[styles.announcementText, rtlText, styles.measureHidden]}
        numberOfLines={3}
        onLayout={(e) => setCollapsedHeight(e.nativeEvent.layout.height)}
      >
        {text}
      </Text>
      <Text
        style={[styles.announcementText, rtlText, styles.measureHidden]}
        onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}
      >
        {text}
      </Text>

      <Animated.View style={[styles.announcementTextClip, animatedStyle]}>
        <Text style={[styles.announcementText, rtlText]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const HEADER_COLLAPSE_RANGE = 90;

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const reducedMotion = useReducedMotion();
  const { t, isRTL, rtlText } = useTranslation();
  const [isAnnouncementExpanded, setIsAnnouncementExpanded] = useState(false);
  const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const children = user?.children ?? [];
  const childIds = children.map((child) => child.id);

  const { data: nextEvent } = useQuery({
    queryKey: ["home", "nextEvent"],
    queryFn: getNextEvent,
  });
  const { data: announcement } = useQuery({
    queryKey: ["home", "announcement"],
    queryFn: getLatestAnnouncement,
  });
  // Shares its cache key with ParentGalleryScreen's `myGallery` query — visiting
  // either screen warms the other, so this rarely triggers its own fetch.
  const { data: galleryGroups } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
    enabled: children.length > 0,
  });
  const heroPhotoUrl = useMemo(() => {
    if (!galleryGroups) return null;
    const tagged = galleryGroups
      .flatMap((group) => group.photos)
      .find((photo) => isPhotoTaggedWithAny(photo, childIds));
    return tagged ? resolvePhotoUrl(tagged.url) : null;
  }, [galleryGroups, childIds.join(",")]);

  const { message: toastMessage, opacity: toastOpacity, showToast } = useToast();

  const primaryChildName = children[0]?.name ?? null;
  const { salutationKey, emoji } = getTimeOfDayGreeting();
  const salutation = t.home[salutationKey];
  const firstName = getFirstName(user?.name);
  const subtitle = t.home.timeOfDaySubtitle[salutationKey](primaryChildName);
  const daysAway = nextEvent ? getDaysAway(parseIsoDate(nextEvent.date), t) : null;
  const greetingComma = isRTL ? "،" : ",";
  const compactGreeting = firstName ? `${salutation}${greetingComma} ${firstName}` : t.home.welcomeBack;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const greetingOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const greetingTranslateY = useSharedValue(reducedMotion ? 0 : 12);
  const emojiScale = useSharedValue(reducedMotion ? 1 : 0.5);
  const subtitleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const footerBreath = useSharedValue(1);

  const announcementOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const announcementTranslateY = useSharedValue(reducedMotion ? 0 : 20);

  useEffect(() => {
    if (!reducedMotion) {
      greetingOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      greetingTranslateY.value = withDelay(300, withTiming(0, { duration: 400 }));
      emojiScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 120 }));
      subtitleOpacity.value = withDelay(450, withTiming(1, { duration: 400 }));

      const sectionEasing = Easing.out(Easing.ease);
      announcementOpacity.value = withDelay(
        300,
        withTiming(1, { duration: 400, easing: sectionEasing })
      );
      announcementTranslateY.value = withDelay(
        300,
        withTiming(0, { duration: 400, easing: sectionEasing })
      );

      footerBreath.value = withDelay(
        800,
        withRepeat(withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
      );
    }
  }, []);

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const footerDotsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: footerBreath.value }],
  }));

  const announcementSectionStyle = useAnimatedStyle(() => ({
    opacity: announcementOpacity.value,
    transform: [{ translateY: announcementTranslateY.value }],
  }));

  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [20, HEADER_COLLAPSE_RANGE], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [20, HEADER_COLLAPSE_RANGE],
          [-16, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const fullHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_COLLAPSE_RANGE], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Screen>
      <View style={[styles.decorTopRight, isRTL ? styles.decorTopRightRTL : styles.decorTopRightLTR]} />
      <View
        style={[styles.decorBottomLeft, isRTL ? styles.decorBottomLeftRTL : styles.decorBottomLeftLTR]}
      />

      <Animated.View
        style={[
          styles.stickyHeader,
          isRTL && { flexDirection: "row-reverse" },
          stickyHeaderStyle,
        ]}
        pointerEvents="none"
      >
        <Image
          source={require("../../assets/steps-logo.png")}
          style={styles.stickyLogo}
          resizeMode="contain"
        />
        <Text style={[styles.stickyGreeting, rtlText]} numberOfLines={1}>
          {compactGreeting}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
        <Animated.View style={fullHeaderStyle}>
          <StepsLogo />

          <View style={styles.greetingBlock}>
            <Animated.View style={[styles.greetingRow, greetingStyle]}>
              <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>
                {firstName ? (
                  <>
                    {salutation}
                    {greetingComma} <Text style={styles.greetingName}>{firstName}</Text>
                  </>
                ) : (
                  t.home.welcomeBack
                )}
              </Text>
              <Animated.Text style={[styles.emoji, emojiStyle]}>{emoji}</Animated.Text>
            </Animated.View>
            <Animated.Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Animated.Text>
          </View>

          <ChildStrip children={children} />
        </Animated.View>

        <HeroCarousel
          t={t}
          isRTL={isRTL}
          childName={primaryChildName}
          nextEvent={nextEvent}
          daysAwayLabel={daysAway?.label ?? null}
          heroPhotoUrl={heroPhotoUrl}
          onToast={showToast}
        />

        <WeeklyScheduleSection />

        <CoursesSection />

        <Animated.View style={[styles.section, announcementSectionStyle]}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.sectionTitle, rtlText]}>{t.home.latestAnnouncement}</Text>
            {isAdmin ? (
              <Touchable
                onPress={() => setIsAnnouncementModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionAddLink}>{t.home.addAnnouncement}</Text>
              </Touchable>
            ) : null}
          </View>

          {announcement ? (
            <StepsCard style={styles.announcementCard}>
              <View
                style={[styles.announcementAccentBar, isRTL ? styles.accentBarRTL : styles.accentBarLTR]}
              />
              <View style={[styles.announcementHeaderRow, isRTL && styles.rowReverse]}>
                <View style={[styles.announcementSenderRow, isRTL && styles.rowReverse]}>
                  <View style={styles.announcementAvatar}>
                    <Text style={styles.announcementAvatarEmoji}>🏫</Text>
                  </View>
                  <Text style={[styles.announcementFrom, rtlText]}>{t.home.fromAcademy}</Text>
                </View>
                <Text style={styles.announcementEmoji}>📢</Text>
              </View>
              <ExpandableAnnouncementText
                text={announcement.text}
                expanded={isAnnouncementExpanded}
                rtlText={rtlText}
              />
              <Touchable
                onPress={() => setIsAnnouncementExpanded((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.readMoreLink, rtlText]}>
                  {isAnnouncementExpanded ? t.common.showLess : t.common.readMore}
                </Text>
              </Touchable>
              <Text style={[styles.announcementTimestamp, rtlText]}>
                {formatRelativeTime(new Date(announcement.createdAt), t)}
              </Text>
            </StepsCard>
          ) : announcement === null ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{t.home.noAnnouncementsYet}</Text>
            </View>
          ) : (
            <SkeletonEventCard thumbCount={0} />
          )}
        </Animated.View>
        </View>

        <View style={styles.footer}>
          <Animated.Text style={[styles.footerMascot, footerDotsStyle]}>🐘</Animated.Text>
          <Text style={styles.footerText}>{t.home.footerTagline}</Text>
        </View>
      </Animated.ScrollView>

      <ToastBanner message={toastMessage} opacity={toastOpacity} />

      {isAdmin ? (
        <>
          <AnnouncementQuickAddModal
            visible={isAnnouncementModalVisible}
            onClose={() => setIsAnnouncementModalVisible(false)}
            onCreated={(created) => {
              queryClient.setQueryData(["home", "announcement"], created);
              setIsAnnouncementModalVisible(false);
            }}
            t={t}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  decorTopRight: {
    position: "absolute",
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },
  decorTopRightLTR: {
    right: -50,
  },
  decorTopRightRTL: {
    left: -50,
  },
  decorBottomLeft: {
    position: "absolute",
    bottom: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.secondary,
    opacity: 0.05,
  },
  decorBottomLeftLTR: {
    left: -50,
  },
  decorBottomLeftRTL: {
    right: -50,
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stickyLogo: {
    width: 32,
    height: 32,
  },
  stickyGreeting: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    flexShrink: 1,
  },
  greetingBlock: {
    alignItems: "center",
    paddingTop: 28,
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  greetingText: {
    ...Type.display,
    color: Colors.bark,
    textAlign: "center",
  },
  greetingName: {
    color: Colors.terracotta,
  },
  emoji: {
    fontSize: 26,
  },
  subtitle: {
    ...Type.caption,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 6,
  },
  carouselWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  carouselSlide: {
    height: 150,
    borderRadius: 24,
    padding: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  heroOverlay: {
    backgroundColor: "rgba(224,122,58,0.75)",
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
  carouselCta: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  carouselCtaPressed: {
    opacity: 0.75,
  },
  carouselCtaText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#FFFFFF",
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
  moodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 16,
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
  childStrip: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 16,
  },
  childChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.linen,
    borderRadius: 40,
    height: 56,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.terracotta}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarEmoji: {
    fontSize: 24,
  },
  childChipName: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.bark,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.bark,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  sectionAddLink: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.terracotta,
  },
  emptyCard: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCardText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
  },
  accentBarLTR: {
    left: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  accentBarRTL: {
    right: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  announcementCard: {
    borderRadius: 16,
  },
  announcementAccentBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: Colors.honey,
  },
  announcementHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  announcementSenderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  announcementAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.honey}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  announcementAvatarEmoji: {
    fontSize: 13,
  },
  announcementFrom: {
    ...Type.caption,
    fontFamily: Fonts.semiBold,
    color: Colors.textLight,
  },
  announcementEmoji: {
    fontSize: 18,
  },
  announcementText: {
    ...Type.body,
    color: Colors.bark,
  },
  measureHidden: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  announcementTextClip: {
    overflow: "hidden",
  },
  readMoreLink: {
    ...Type.caption,
    fontFamily: Fonts.semiBold,
    color: Colors.terracotta,
    marginTop: 6,
  },
  announcementTimestamp: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 10,
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
  },
  footerMascot: {
    fontSize: 24,
    marginBottom: 6,
  },
  footerText: {
    ...Type.caption,
    color: Colors.textLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 22, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: Colors.textLight,
  },
  modalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalError: {
    fontFamily: Fonts.semiBold,
    color: Colors.clay,
    marginTop: 12,
    textAlign: "center",
  },
  modalButton: {
    marginTop: 20,
  },
});
