import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActivityFormModal } from "../components/admin/ActivityFormModal";
import { EmptyState } from "../components/gallery/EmptyState";
import { Screen } from "../components/Screen";
import { BalloonLoader } from "../components/ui/BalloonLoader";
import { ScreenFadeIn } from "../components/ui/ScreenFadeIn";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import {
  ActivityInput,
  createActivity,
  deleteActivity,
  formatTime,
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleActivity | null>(null);

  const { data: days, isError } = useQuery({ queryKey: ["schedule"], queryFn: getWeekSchedule });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["schedule"] });

  const save = useMutation({
    mutationFn: (input: ActivityInput) =>
      editing ? updateActivity(editing.id, input) : createActivity(input),
    onSuccess: () => {
      refresh();
      setIsFormOpen(false);
      setEditing(null);
    },
    onError: () =>
      Alert.alert(t.scheduleAdmin.saveFailed, t.common.tryAgain, [{ text: t.common.ok }]),
  });

  const remove = useMutation({
    mutationFn: (activityId: string) => deleteActivity(activityId),
    onSuccess: refresh,
  });

  const dayData = days?.find((entry) => entry.day === selectedDay);

  const confirmDelete = (activity: ScheduleActivity) =>
    Alert.alert(t.scheduleAdmin.deleteTitle, t.scheduleAdmin.deleteMessage(activity.name), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.scheduleAdmin.delete,
        style: "destructive",
        onPress: () => remove.mutate(activity.id),
      },
    ]);

  return (
    <Screen>
      <ScreenFadeIn style={styles.flex}>
        <StepsHeader title={t.scheduleAdmin.title} subtitle={t.scheduleAdmin.subtitle} showBack />

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
                  style={[styles.dayName, { color: isSelected ? "#FFFFFF" : Colors.textLight }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t.home.weekDays[day]}
                </Text>
                <Text
                  style={[styles.dayCount, { color: isSelected ? "#FFFFFF" : Colors.bark }]}
                >
                  {count}
                </Text>
              </Touchable>
            );
          })}
        </View>

        <StepsButton
          label={t.scheduleAdmin.addActivity}
          onPress={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
          style={styles.addButton}
        />

        {isError ? (
          <EmptyState emoji="⚠️" title={t.scheduleAdmin.couldntLoad} subtitle={t.common.tryAgain} />
        ) : !days ? (
          <BalloonLoader label={t.scheduleAdmin.loading} />
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
                    { backgroundColor: activity.accentColor ?? Colors.honey },
                  ]}
                />
                <View style={[styles.cardRow, isRTL && styles.rowReverse]}>
                  <Text style={styles.emoji}>{activity.emoji}</Text>
                  <View style={styles.flex}>
                    <Text style={[styles.name, rtlText]} numberOfLines={1}>
                      {activity.name}
                    </Text>
                    <Text style={[styles.meta, rtlText]}>
                      {formatTime(activity.startTime)} ·{" "}
                      {t.home.scheduleDuration(activity.durationMinutes)}
                    </Text>
                  </View>
                  <Touchable
                    onPress={() => {
                      setEditing(activity);
                      setIsFormOpen(true);
                    }}
                    hitSlop={6}
                    style={styles.iconAction}
                  >
                    <Text style={styles.editText}>{t.scheduleAdmin.edit}</Text>
                  </Touchable>
                  <Touchable
                    onPress={() => confirmDelete(activity)}
                    hitSlop={6}
                    disabled={remove.isPending}
                    style={styles.iconAction}
                  >
                    {remove.isPending && remove.variables === activity.id ? (
                      <ActivityIndicator color={Colors.clay} />
                    ) : (
                      <Text style={styles.deleteText}>🗑</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  dayTabs: { flexDirection: "row", gap: 8, marginTop: 16 },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 62,
    gap: 3,
  },
  dayTabActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  dayName: { fontFamily: Fonts.semiBold, fontSize: 12 },
  dayCount: { fontFamily: Fonts.bold, fontSize: 17 },
  addButton: { marginTop: 14, marginBottom: 4 },
  list: { paddingTop: 12, paddingBottom: 32, gap: 10 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    paddingStart: 18,
    overflow: "hidden",
  },
  accent: { position: "absolute", top: 0, bottom: 0, start: 0, width: 5 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 24, width: 30, textAlign: "center" },
  name: { ...Type.body, fontFamily: Fonts.semiBold, color: Colors.bark },
  meta: { ...Type.caption, color: Colors.textLight, marginTop: 2 },
  iconAction: { paddingHorizontal: 6, paddingVertical: 4 },
  editText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.terracotta },
  deleteText: { fontSize: 17 },
});
