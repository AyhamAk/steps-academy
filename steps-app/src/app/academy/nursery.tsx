import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PillarPhotoGallery } from "../../components/gallery/PillarPhotoGallery";
import { ParentTipCard } from "../../components/tips/ParentTipCard";
import { DayTimeline } from "../../components/schedule/DayTimeline";
import {
  minutesNow,
  toMinutes,
  todayAcademyDay,
} from "../../components/schedule/scheduleTime";
import { WeekDaySelector } from "../../components/schedule/WeekDaySelector";
import { Screen } from "../../components/Screen";
import { DataErrorState } from "../../components/ui/DataErrorState";
import { ScreenFadeIn } from "../../components/ui/ScreenFadeIn";
import { SkeletonScheduleRows } from "../../components/ui/Skeleton";
import { StepsHeader } from "../../components/ui/StepsHeader";
import { SubTabSwitcher } from "../../components/ui/SubTabSwitcher";
import { Colors } from "../../constants/Colors";
import { CardWash } from "../../components/ui/CardWash";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import {
  formatTimeColumn,
  getWeekSchedule,
  WEEK_DAYS,
  WeekDay,
} from "../../services/scheduleApi";
import { listTips } from "../../services/tipsApi";
import { AGE_BANDS } from "../../utils/ageBand";

/**
 * The nursery: what the under-threes are doing, today and this week.
 *
 * The weekly timetable used to be a section on Home, below everything else.
 * It belongs here — it is the nursery's day, and Home is now the four pillar
 * tiles rather than a scroll through every section at once.
 */
export default function NurseryScreen() {
  const { t, isRTL } = useTranslation();
  const today = todayAcademyDay();
  const [selectedDay, setSelectedDay] = useState<WeekDay>(today);
  const [tab, setTab] = useState<0 | 1>(0);

  // Re-render on the minute so the now marker moves on its own — a parent who
  // leaves the app open should not have to pull to refresh to see it advance.
  const [now, setNow] = useState(minutesNow);
  useEffect(() => {
    const id = setInterval(() => setNow(minutesNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const {
    data: days,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["schedule"],
    queryFn: getWeekSchedule,
  });

  // Same key as the Tips screen, so the card and the pillar show one tip.
  const { data: tips } = useQuery({
    queryKey: ["tips", "published"],
    queryFn: listTips,
  });
  const currentTip = tips?.[0];

  const dayData = days?.find((day) => day.day === selectedDay);
  const activities = useMemo(() => dayData?.activities ?? [], [dayData]);

  /** The next thing due today, which is what the hero card is for. */
  const upNext = useMemo(() => {
    const todayActivities =
      days?.find((day) => day.day === today)?.activities ?? [];
    return [...todayActivities]
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .find((activity) => toMinutes(activity.startTime) > now);
  }, [days, today, now]);

  const textAlign = isRTL ? "right" : "left";

  /**
   * Arabic and Hebrew have no letter case, so uppercasing is at best a no-op
   * and at worst mangles a glyph. Latin labels only.
   */
  const caps = (value: string) => (isRTL ? value : value.toUpperCase());

  // "Sunday 30" — weekday and day only. formatEventDate would add the month,
  // which is noise on a label that already says "today".
  const nowDate = new Date();
  const todayDateLabel = `${t.common.weekdays[nowDate.getDay()]} ${nowDate.getDate()}`;

  const todayActivities =
    days?.find((day) => day.day === today)?.activities ?? [];
  const doneCount = todayActivities.filter(
    (activity) => toMinutes(activity.startTime) <= now,
  ).length;

  /** The first thing on the next academy day that has anything scheduled. */
  const tomorrowFirst = useMemo(() => {
    if (!days) return undefined;
    const order = WEEK_DAYS.indexOf(today);
    for (let step = 1; step <= WEEK_DAYS.length; step += 1) {
      const candidate = WEEK_DAYS[(order + step) % WEEK_DAYS.length];
      const items = days.find((day) => day.day === candidate)?.activities ?? [];
      if (items.length > 0) {
        return [...items].sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        )[0];
      }
    }
    return undefined;
  }, [days, today]);

  const daySummaryLabel = tomorrowFirst
    ? t.academy.nurseryDaySummary(
        doneCount,
        formatTimeColumn(tomorrowFirst.startTime, t),
      )
    : t.academy.nurseryDaySummaryNoTomorrow(doneCount);

  return (
    <Screen safeBottom>
      <ScreenFadeIn>
        <StepsHeader title={t.academy.nurseryTitle} showBack />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[styles.subtitle, { textAlign }]}
            maxFontSizeMultiplier={1.3}
          >
            {t.academy.ageRange(AGE_BANDS.nursery.min, AGE_BANDS.nursery.max)}
          </Text>

          <SubTabSwitcher
            tabs={[t.academy.tabSchedule, t.academy.tabPhotos]}
            activeIndex={tab}
            onChange={setTab}
          />

          {tab === 1 ? (
            <PillarPhotoGallery section="nursery" />
          ) : (
            <>
              <View style={styles.todayCard}>
                <CardWash index={2} />
                {/* Separate nodes around the "·": composing one string from words,
                a separator and digits lets the bidi algorithm move the
                separator in Arabic. */}
                <View
                  style={[styles.todayLabelRow, isRTL && styles.rowReverse]}
                >
                  <Text style={styles.todayLabel} maxFontSizeMultiplier={1.2}>
                    {caps(t.academy.nurseryToday)}
                  </Text>
                  <Text style={styles.todayLabel} maxFontSizeMultiplier={1.2}>
                    ·
                  </Text>
                  <Text style={styles.todayLabel} maxFontSizeMultiplier={1.2}>
                    {caps(todayDateLabel)}
                  </Text>
                </View>

                <Text
                  style={[styles.todayTitle, { textAlign }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {upNext ? upNext.name : t.academy.nurseryDayDone}
                </Text>

                {upNext ? (
                  <View style={[styles.todayMeta, isRTL && styles.rowReverse]}>
                    <Text
                      style={styles.todaySummary}
                      maxFontSizeMultiplier={1.3}
                    >
                      {formatTimeColumn(upNext.startTime, t)}
                    </Text>
                    <Text
                      style={styles.todaySummary}
                      maxFontSizeMultiplier={1.3}
                    >
                      ·
                    </Text>
                    <Text
                      style={styles.todaySummary}
                      maxFontSizeMultiplier={1.3}
                    >
                      {t.home.scheduleDuration(upNext.durationMinutes)}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[styles.todaySummary, { textAlign }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {daySummaryLabel}
                  </Text>
                )}
              </View>

              <Text
                style={[styles.sectionLabel, { textAlign }]}
                maxFontSizeMultiplier={1.3}
              >
                {caps(t.academy.nurseryThisWeek)}
              </Text>

              <WeekDaySelector
                selected={selectedDay}
                onSelect={setSelectedDay}
              />

              {isPending ? (
                <SkeletonScheduleRows />
              ) : isError || !days ? (
                <DataErrorState onRetry={() => void refetch()} />
              ) : activities.length === 0 ? (
                <View style={styles.placeholder}>
                  <Text
                    style={styles.placeholderText}
                    maxFontSizeMultiplier={1.4}
                  >
                    {t.home.scheduleEmptyDay}
                  </Text>
                </View>
              ) : (
                <DayTimeline
                  activities={activities}
                  selectedDay={selectedDay}
                  nowMinutes={now}
                />
              )}

              {currentTip ? <ParentTipCard tip={currentTip} /> : null}
            </>
          )}
        </ScrollView>
      </ScreenFadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // A pushed stack route, so there is no tab bar to clear — only the home
  // indicator, which `Screen safeBottom` already reserves.
  scroll: { paddingBottom: 24 },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 14,
  },
  todayCard: {
    overflow: "hidden",
    backgroundColor: Colors.blueTint,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  todayLabelRow: { flexDirection: "row", gap: 4, marginBottom: 3 },
  todayLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.blueDeep,
    letterSpacing: 0.5,
  },
  todayTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.bark,
  },
  todayMeta: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  rowReverse: { flexDirection: "row-reverse" },
  todaySummary: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  placeholder: { paddingVertical: 26, alignItems: "center" },
  placeholderText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
  },
});
