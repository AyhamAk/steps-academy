import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
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
  withTiming,
} from "react-native-reanimated";

import { AdminHomeSections } from "../../components/home/AdminHomeSections";
import { FeedbackModal } from "../../components/home/FeedbackModal";
import { Screen } from "../../components/Screen";
import { DataErrorState } from "../../components/ui/DataErrorState";
import { SkeletonHomeSections } from "../../components/ui/Skeleton";
import { NotificationBell } from "../../components/ui/NotificationBell";
import { StepsLogo } from "../../components/ui/StepsLogo";
import { ToastBanner, useToast } from "../../components/ui/Toast";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";

import { useLayout } from "../../hooks/useLayout";
import { useReduceMotionSetting } from "../../hooks/useReduceMotionSetting";
import { Translations } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
import { listCourses } from "../../services/coursesApi";
import { getWeekSchedule, WEEK_DAYS } from "../../services/scheduleApi";
import { adminOverview } from "../../services/studentsApi";
import {
  getNextEvent,
  isPhotoTaggedWithAny,
  myGallery,
  resolvePhotoUrl,
} from "../../services/galleryApi";
import { useAuthStore } from "../../store/authStore";
import { formatIsoDate, parseIsoDate } from "../../utils/date";
import { Touchable } from "../../components/ui/Touchable";
import { AcademyGrid } from "../../components/home/AcademyGrid";
import { HeroCarousel } from "../../components/home/HeroCarousel";
import { ProgramCard } from "../../components/home/ProgramCard";
import { AGE_BANDS, bandForChild } from "../../utils/ageBand";

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

/** Thumbnails in the first slide's photo strip. Four fits the narrowest phone. */
const HERO_PHOTO_COUNT = 4;

/**
 * The parent's children as selectable pills.
 *
 * A single child still renders its pill — it names who the screen is about,
 * which the greeting alone leaves implicit once a parent has more than one.
 * Selection is the only thing that moves; the rest of Home reads it.
 */
function ChildStrip({
  children,
  selectedId,
  onSelect,
}: {
  children: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (children.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.childStrip}
    >
      {children.map((child) => {
        const isSelected = child.id === selectedId;
        return (
          <Touchable
            key={child.id}
            onPress={() => onSelect(child.id)}
            style={[styles.childChip, isSelected && styles.childChipSelected]}
          >
            <Text
              style={[styles.childChipName, isSelected && styles.childChipNameSelected]}
              maxFontSizeMultiplier={1.4}
            >
              {child.name}
            </Text>
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

const HEADER_COLLAPSE_RANGE = 90;

export default function HomeScreen() {
  const { width, gutter, insets } = useLayout();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const reducedMotion = useReducedMotion();
  const { t, isRTL, rtlText } = useTranslation();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const queryClient = useQueryClient();

  const children = user?.children ?? [];
  const childIds = children.map((child) => child.id);
  // Which child Home is currently about. Null until the account's children have
  // loaded, and reset if the selected one goes away (an admin unlinking them).
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const selectedChild =
    children.find((child) => child.id === selectedChildId) ?? children[0] ?? null;

  const nextEventQuery = useQuery({
    queryKey: ["home", "nextEvent"],
    queryFn: getNextEvent,
  });
  // Shares its cache key with ParentGalleryScreen's `myGallery` query — visiting
  // either screen warms the other, so this rarely triggers its own fetch.
  const galleryQuery = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
    enabled: children.length > 0,
  });
  // Same query keys as CoursesSection / WeeklyScheduleSection, so react-query
  // hands back the one shared cache entry rather than fetching twice. Home only
  // reads their status: it needs to know when *everything* has landed before it
  // drops the skeleton, otherwise sections pop in one at a time.
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const scheduleQuery = useQuery({ queryKey: ["schedule"], queryFn: getWeekSchedule });
  const adminOverviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminOverview,
    enabled: isAdmin,
  });

  const nextEvent = nextEventQuery.data;
  const galleryGroups = galleryQuery.data;

  // A disabled query sits in `pending` forever, so only count the ones that
  // actually run for this user — otherwise a childless parent or a non-admin
  // would wait on a request that is never going to be made.
  const sectionQueries = [
    nextEventQuery,
    scheduleQuery,
    ...(isAdmin ? [adminOverviewQuery] : [coursesQuery]),
    ...(children.length > 0 ? [galleryQuery] : []),
  ];
  const isHomeLoading = sectionQueries.some((query) => query.isPending && query.fetchStatus !== "idle");
  const hasHomeFailed = sectionQueries.every((query) => query.isError);

  const retryHome = () => {
    for (const query of sectionQueries) void query.refetch();
  };
  // Thumbnails for the first slide's strip. Groups arrive newest-event-first,
  // so taking from the front means the strip shows the most recent day out.
  const heroPhotoUrls = useMemo(() => {
    if (!galleryGroups) return [];
    // Narrowed to the selected child, so switching chips changes the strip
    // rather than showing every child's photos under one child's name.
    const ids = selectedChild ? [selectedChild.id] : childIds;
    return galleryGroups
      .flatMap((group) => group.photos)
      .filter((photo) => isPhotoTaggedWithAny(photo, ids))
      .slice(0, HERO_PHOTO_COUNT)
      .map((photo) => resolvePhotoUrl(photo.url));
  }, [galleryGroups, selectedChild?.id, childIds.join(",")]);

  // Today's photos of the selected child, and how many activities their
  // timetable holds today. Both read caches Home already has.
  const todaysPhotoCount = useMemo(() => {
    if (!galleryGroups || !selectedChild) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return galleryGroups
      .filter((group) => group.event.date === today)
      .flatMap((group) => group.photos)
      .filter((photo) => isPhotoTaggedWithAny(photo, [selectedChild.id])).length;
  }, [galleryGroups, selectedChild?.id]);

  const todaysActivityCount = useMemo(() => {
    const days = scheduleQuery.data;
    if (!days) return 0;
    // WEEK_DAYS covers Sun–Thu, the academy's week, so Friday and Saturday
    // fall off the end and correctly report nothing scheduled.
    const today = WEEK_DAYS[new Date().getDay()];
    if (!today) return 0;
    return days.find((day) => day.day === today)?.activities.length ?? 0;
  }, [scheduleQuery.data]);

  /**
   * Courses the selected child holds a confirmed place in.
   *
   * `approved` only — what the UI calls "Enrolled". A pending request is not a
   * place, and rejected or cancelled ones are still returned by the API.
   */
  const enrolledCourseCount = useMemo(() => {
    if (!selectedChild) return 0;
    return (coursesQuery.data ?? []).filter((course) =>
      course.myEnrollments.some(
        (enrollment) =>
          enrollment.studentId === selectedChild.id && enrollment.status === "approved"
      )
    ).length;
  }, [coursesQuery.data, selectedChild?.id]);

  const selectedBand = bandForChild(selectedChild?.birthDate);
  const programName = selectedBand
    ? [
        selectedBand === "nursery" ? t.home.tileNursery : t.home.tileCourses,
        t.academy.ageRange(AGE_BANDS[selectedBand].min, AGE_BANDS[selectedBand].max),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const { message: toastMessage, opacity: toastOpacity, showToast } = useToast();

  const primaryChildName = selectedChild?.name ?? null;
  const { salutationKey, emoji } = getTimeOfDayGreeting();
  const salutation = t.home[salutationKey];
  const firstName = getFirstName(user?.name);
  const daysAway = nextEvent ? getDaysAway(parseIsoDate(nextEvent.date), t) : null;
  const greetingComma = isRTL ? "،" : ",";
  const compactGreeting = firstName ? `${salutation}${greetingComma} ${firstName}` : t.home.welcomeBack;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const footerBreath = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {

      footerBreath.value = withDelay(
        800,
        withRepeat(withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
      );
    }
  }, []);

  const footerDotsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: footerBreath.value }],
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
          {/* Bell and greeting share one line. The logo and a centred,
              two-line greeting used to take the whole first screen, which
              pushed the four tiles — the actual way into the app — below the
              fold. The logo still rides in the sticky header on scroll. */}
          <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
            <Text
              style={[styles.greeting, rtlText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={1.3}
            >
              {firstName ? (
                <>
                  {salutation}
                  {greetingComma} <Text style={styles.greetingName}>{firstName}</Text>
                </>
              ) : (
                t.home.welcomeBack
              )}{" "}
              {emoji}
            </Text>
            {isAdmin ? null : <NotificationBell />}
          </View>

          {isAdmin ? null : (
            <ChildStrip
              children={children}
              selectedId={selectedChild?.id ?? null}
              onSelect={setSelectedChildId}
            />
          )}
        </Animated.View>

        {isHomeLoading ? (
          <SkeletonHomeSections isAdmin={isAdmin} />
        ) : hasHomeFailed ? (
          <DataErrorState onRetry={retryHome} />
        ) : (
          <>
        {isAdmin ? (
          <AdminHomeSections />
        ) : (
          <>
            <AcademyGrid />

            {selectedChild ? (
              <ProgramCard
                childName={selectedChild.name}
                programName={programName}
                courseCount={enrolledCourseCount}
                activityCount={todaysActivityCount}
                photoCount={todaysPhotoCount}
              />
            ) : null}

            <HeroCarousel
              t={t}
              isRTL={isRTL}
              childName={primaryChildName}
              nextEvent={nextEvent}
              daysAwayLabel={daysAway?.label ?? null}
              heroPhotoUrls={heroPhotoUrls}
              onToast={showToast}
              onFeedback={() => setIsFeedbackOpen(true)}
            />
          </>
        )}

          </>
        )}
        </View>

        <View style={styles.footer}>
          <Animated.Text style={[styles.footerMascot, footerDotsStyle]}>🐘</Animated.Text>
          <Text style={styles.footerText}>{t.home.footerTagline}</Text>
        </View>
      </Animated.ScrollView>

      <FeedbackModal
        visible={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSent={showToast}
      />

      <ToastBanner message={toastMessage} opacity={toastOpacity} />

    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    // The tab bar is opaque and laid out below the scene, not over it, so the
    // scroll view already stops above it. Reserving its height here as well
    // left a tab bar's worth of blank space under the footer.
    paddingBottom: 12,
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.bark,
    flexShrink: 1,
  },
  greetingName: {
    color: Colors.terracotta,
  },
  // The child's recent photos, inside the slide rather than behind it — text
  // keeps a flat gradient underneath it, so legibility never depends on what
  // happens to be in the picture.
  carouselCtaPressed: {
    opacity: 0.75,
  },
  childStrip: {
    // Centred, and it stays centred with one child. flexGrow lets the content
    // fill the scroll view so justifyContent can centre it, while still
    // scrolling normally once there are more chips than fit on a line.
    flexGrow: 1,
    justifyContent: "center",
    gap: 8,
    paddingBottom: 18,
  },
  childChip: {
    justifyContent: "center",
    backgroundColor: Colors.linen,
    borderRadius: 99,
    minHeight: 32,
    paddingHorizontal: 20,
    paddingVertical: 6,
    // A transparent border on the resting state so selecting a chip changes
    // its colour without changing its size and nudging the row.
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  childChipSelected: {
    backgroundColor: Colors.cream,
    borderColor: Colors.terracotta,
  },
  childChipName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
  },
  childChipNameSelected: {
    color: Colors.terracotta,
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
  announcementAvatarEmoji: {
    fontSize: 13,
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
  footer: {
    marginTop: 20,
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
});
