import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActivityFormModal } from "../components/admin/ActivityFormModal";
import AdminHeader from "../components/admin/AdminHeader";
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
    <Screen safeBottom>
      <ScreenFadeIn style={styles.flex}>
        <AdminHeader title={t.scheduleAdmin.title} subtitle={t.scheduleAdmin.subtitle} />

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
                    { backgroundColor: activity.accentColor ?? Colors.honey },
                  ]}
                />
                <View style={[styles.cardRow, isRTL && styles.rowReverse]}>
                  <IconTile tint={activity.accentColor ?? Colors.honey} size={40}>
                    <Text style={styles.emoji}>{activity.emoji}</Text>
                  </IconTile>
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
                    style={styles.iconAction}
                    accessibilityLabel={t.scheduleAdmin.edit}
                  >
                    <Ionicons name="pencil-outline" size={20} color={Colors.terracotta} />
                  </Touchable>
                  <Touchable
                    onPress={() => confirmDelete(activity)}
                    disabled={remove.isPending}
                    style={styles.iconAction}
                    accessibilityLabel={t.scheduleAdmin.delete}
                  >
                    {remove.isPending && remove.variables === activity.id ? (
                      <ActivityIndicator color={Colors.clay} />
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
  dayTabActive: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  dayLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textLight },
  dayLabelActive: { color: Colors.cream },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: Colors.terracotta,
  },
  dayDotActive: { backgroundColor: Colors.cream },
  dayDotSpacer: { width: 6, height: 6, marginTop: 6 },
  addButton: { marginTop: 12, marginBottom: 4, height: 48, borderRadius: 14 },
  list: { paddingTop: 12, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
  meta: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: Colors.textLight, marginTop: 2 },
  iconAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
