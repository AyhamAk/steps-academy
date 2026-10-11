import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActivityFormModal } from "../components/admin/ActivityFormModal";
import AdminHeader from "../components/admin/AdminHeader";
import { ScheduleTemplatesSheet } from "../components/admin/ScheduleTemplatesSheet";
import { addWeeks, currentWeekStart, formatWeekRange } from "../components/schedule/scheduleTime";
import IconTile from "../components/ui/IconTile";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { SkeletonCardList } from "../components/ui/Skeleton";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import {
  ActivityInput,
  activityTitle,
  applyWeekTemplate,
  createActivity,
  deleteActivity,
  dismissTemplateSuggestion,
  formatTime,
  getTemplateSuggestion,
  getWeekSchedule,
  ScheduleActivity,
  updateActivity,
  WEEK_DAYS,
  WeekDay,
} from "../services/scheduleApi";

export default function ScheduleAdminScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<WeekDay>("sun");
  // Every load and edit on this screen is about this one dated week.
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleActivity | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const { data: days, isError } = useQuery({
    queryKey: ["schedule", weekStart],
    queryFn: () => getWeekSchedule(weekStart),
  });
  const { data: suggestion } = useQuery({
    queryKey: ["schedule-suggestion", weekStart],
    queryFn: () => getTemplateSuggestion(weekStart),
  });
  // Every week, not only this one: an edit carries forward into later weeks
  // that have none of their own, and parents' screens share these keys.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["schedule-suggestion"] });
  };

  const apply = useMutation({
    mutationFn: (templateId: string) => applyWeekTemplate(templateId, weekStart),
    onSuccess: () => {
      refresh();
      setTemplatesOpen(false);
    },
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const dismiss = useMutation({
    mutationFn: () => dismissTemplateSuggestion(weekStart),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule-suggestion", weekStart] }),
  });

  const weekLabel = formatWeekRange(weekStart, t);
  const weekHasActivities = (days ?? []).some((day) => day.activities.length > 0);

  const confirmApply = (templateId: string) =>
    Alert.alert(t.scheduleAdmin.applyConfirmTitle, t.scheduleAdmin.applyConfirmBody(weekLabel), [
      { text: t.common.cancel, style: "cancel" },
      { text: t.scheduleAdmin.apply, style: "destructive", onPress: () => apply.mutate(templateId) },
    ]);

  const save = useMutation({
    mutationFn: (input: ActivityInput) =>
      editing ? updateActivity(editing.id, input, weekStart) : createActivity(input, weekStart),
    onSuccess: () => {
      refresh();
      setIsFormOpen(false);
      setEditing(null);
    },
    onError: () =>
      Alert.alert(t.scheduleAdmin.saveFailed, t.common.tryAgain, [{ text: t.common.ok }]),
  });

  const remove = useMutation({
    mutationFn: (activityId: string) => deleteActivity(activityId, weekStart),
    onSuccess: refresh,
  });

  const dayData = days?.find((entry) => entry.day === selectedDay);

  const confirmDelete = (activity: ScheduleActivity) =>
    Alert.alert(t.scheduleAdmin.deleteTitle, t.scheduleAdmin.deleteMessage(activityTitle(activity, t)), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.scheduleAdmin.delete,
        style: "destructive",
        onPress: () => remove.mutate(activity.id),
      },
    ]);

  return (
    <Screen safeBottom>
      <ScreenFadeIn style={styles.flex}>
        <AdminHeader title={t.scheduleAdmin.title} subtitle={t.scheduleAdmin.subtitle} />

        {/* The week being edited. "Previous" sits on the reading-start side,
            so the arrows swap places and glyphs in RTL. */}
        <View style={[styles.weekRow, isRTL && styles.rowReverse]}>
          <Touchable
            onPress={() => setWeekStart((week) => addWeeks(week, -1))}
            style={styles.chevronBtn}
            accessibilityLabel={t.scheduleAdmin.previousWeek}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={Colors.textLight} />
          </Touchable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Touchable
            onPress={() => setWeekStart((week) => addWeeks(week, 1))}
            style={styles.chevronBtn}
            accessibilityLabel={t.scheduleAdmin.nextWeek}
          >
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={22} color={Colors.textLight} />
          </Touchable>
        </View>

        {suggestion ? (
          <View style={[styles.suggestionRow, isRTL && styles.rowReverse]}>
            <Text style={styles.suggestionIcon}>💡</Text>
            <View style={styles.suggestionText}>
              <Text style={[styles.suggestionTitle, rtlText]} numberOfLines={1}>
                {suggestion.name}
              </Text>
              <Text style={[styles.suggestionSub, rtlText]} numberOfLines={1}>
                {t.scheduleAdmin.suggestionSub}
              </Text>
            </View>
            <Touchable style={styles.applySmallBtn} onPress={() => confirmApply(suggestion.templateId)}>
              <Text style={styles.applySmallText}>{t.scheduleAdmin.apply}</Text>
            </Touchable>
            <Touchable
              onPress={() => dismiss.mutate()}
              style={styles.dismissBtn}
              accessibilityLabel={t.common.done}
            >
              <Text style={styles.dismissText}>✕</Text>
            </Touchable>
          </View>
        ) : null}

        {/* Same day-tab pattern parents see, so the admin edits what they'll get. */}
        <View style={[styles.dayTabs, isRTL && styles.rowReverse]}>
          {WEEK_DAYS.map((day) => {
            const isSelected = day === selectedDay;
            const count = days?.find((entry) => entry.day === day)?.activities.length ?? 0;
            return (
              <Touchable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
              >
                <Text
                  style={[styles.dayLabel, isSelected && styles.dayLabelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t.home.weekDays[day]}
                </Text>
                {count > 0 ? (
                  <View style={[styles.dayDot, isSelected && styles.dayDotActive]} />
                ) : (
                  <View style={styles.dayDotSpacer} />
                )}
              </Touchable>
            );
          })}
        </View>

        <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
          <StepsButton
            label={t.scheduleAdmin.addActivity}
            onPress={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            style={styles.addButton}
          />
          <Touchable style={styles.templatesBtn} onPress={() => setTemplatesOpen(true)}>
            <Text style={styles.templatesBtnText} numberOfLines={1}>
              📋 {t.scheduleAdmin.templates}
            </Text>
          </Touchable>
        </View>

        {isError ? (
          <EmptyState emoji="⚠️" title={t.scheduleAdmin.couldntLoad} subtitle={t.common.tryAgain} />
        ) : !days ? (
          <SkeletonCardList count={5} height={68} />
        ) : !dayData || dayData.activities.length === 0 ? (
          <EmptyState
            emoji="🗓"
            title={t.scheduleAdmin.emptyDay}
            subtitle={t.scheduleAdmin.emptyDaySubtitle}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {dayData.activities.map((activity) => (
              <View key={activity.id} style={styles.card}>
                <View
                  style={[
                    styles.accent,
                    { backgroundColor: activity.accentColor ?? Colors.gold },
                  ]}
                />
                <View style={[styles.cardRow, isRTL && styles.rowReverse]}>
                  <IconTile tint={activity.accentColor ?? Colors.gold} size={40}>
                    <Text style={styles.emoji}>{activity.emoji}</Text>
                  </IconTile>
                  <View style={styles.flex}>
                    <Text style={[styles.name, rtlText]} numberOfLines={1}>
                      {activityTitle(activity, t)}
                    </Text>
                    {/* Separate Text nodes so the Latin time keeps its own
                        direction inside an Arabic line. */}
                    <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
                      <Text style={styles.metaLtr}>{formatTime(activity.startTime, t)}</Text>
                      <Text style={styles.meta}>·</Text>
                      <Text style={styles.meta}>
                        {t.home.scheduleDuration(activity.durationMinutes)}
                      </Text>
                    </View>
                  </View>
                  <Touchable
                    onPress={() => {
                      setEditing(activity);
                      setIsFormOpen(true);
                    }}
                    style={styles.iconAction}
                    accessibilityLabel={t.scheduleAdmin.edit}
                  >
                    <Ionicons name="pencil-outline" size={20} color={Colors.sage} />
                  </Touchable>
                  <Touchable
                    onPress={() => confirmDelete(activity)}
                    disabled={remove.isPending}
                    style={styles.iconAction}
                    accessibilityLabel={t.scheduleAdmin.delete}
                  >
                    {remove.isPending && remove.variables === activity.id ? (
                      <ActivityIndicator color={Colors.rose} />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color={Colors.textLight} />
                    )}
                  </Touchable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </ScreenFadeIn>

      <ActivityFormModal
        visible={isFormOpen}
        day={selectedDay}
        activity={editing}
        isSaving={save.isPending}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => save.mutate(input)}
      />

      <ScheduleTemplatesSheet
        visible={templatesOpen}
        weekStart={weekStart}
        weekHasActivities={weekHasActivities}
        onClose={() => setTemplatesOpen(false)}
        onApply={confirmApply}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  dayTabs: { flexDirection: "row", gap: 8, marginTop: 8 },
  dayTab: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTabActive: { backgroundColor: Colors.sage, borderColor: Colors.sage },
  dayLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textLight },
  dayLabelActive: { color: Colors.cream },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: Colors.sage,
  },
  dayDotActive: { backgroundColor: Colors.cream },
  dayDotSpacer: { width: 6, height: 6, marginTop: 6 },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
  },
  chevronBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  weekLabel: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  suggestionIcon: { fontSize: 16 },
  suggestionText: { flex: 1, minWidth: 0 },
  suggestionTitle: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.text },
  suggestionSub: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textLight },
  applySmallBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 13,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  applySmallText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.background },
  dismissBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dismissText: { fontSize: 15, color: Colors.textLight },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 4 },
  addButton: { flex: 1, height: 48, borderRadius: 14 },
  templatesBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  templatesBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.primary },
  list: { paddingTop: 12, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    padding: 12,
    paddingStart: 16,
    minHeight: 68,
    justifyContent: "center",
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    width: 4,
    borderTopEndRadius: 2,
    borderBottomEndRadius: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 20 },
  name: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 22, color: Colors.bark },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.textLight },
  metaLtr: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    writingDirection: "ltr",
  },
  iconAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
