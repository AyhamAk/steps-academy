import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import {
  deleteWeekTemplate,
  listWeekTemplates,
  saveWeekTemplate,
  WeekTemplateSummary,
} from "../../services/scheduleApi";
import { formatMonthYear, formatWeekRange } from "../schedule/scheduleTime";
import { Touchable } from "../ui/Touchable";

type ScheduleTemplatesSheetProps = {
  visible: boolean;
  weekStart: string;
  /** Saving an empty week is blocked: the template would be no use. */
  weekHasActivities: boolean;
  onClose: () => void;
  /** The screen asks before replacing the week, the same as from the suggestion. */
  onApply: (templateId: string) => void;
};

/**
 * The saved weeks: apply one to the week on screen, or save that week as a
 * new one. Both views live in one sheet because iOS can't show a second
 * Modal on top of the first.
 */
export function ScheduleTemplatesSheet({
  visible,
  weekStart,
  weekHasActivities,
  onClose,
  onApply,
}: ScheduleTemplatesSheetProps) {
  const { t, isRTL, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(28);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"list" | "save">("list");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!visible) return;
    setMode("list");
    setName("");
  }, [visible]);

  const { data: templates, isPending } = useQuery({
    queryKey: ["schedule-templates"],
    queryFn: listWeekTemplates,
    enabled: visible,
  });

  const save = useMutation({
    mutationFn: () => saveWeekTemplate(name.trim(), weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-templates"] });
      setMode("list");
      setName("");
      Alert.alert(t.scheduleAdmin.templateSaved);
    },
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const remove = useMutation({
    mutationFn: (templateId: string) => deleteWeekTemplate(templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule-templates"] }),
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const confirmDelete = (template: WeekTemplateSummary) =>
    Alert.alert(t.scheduleAdmin.deleteTemplateTitle, template.name, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.scheduleAdmin.delete,
        style: "destructive",
        onPress: () => remove.mutate(template.id),
      },
    ]);

  const row = isRTL && styles.rowReverse;
  const canSave = name.trim().length > 0 && weekHasActivities && !save.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={[styles.sheetHeader, row]}>
            <Text style={styles.sheetTitle}>
              {mode === "list" ? t.scheduleAdmin.templates : t.scheduleAdmin.saveAsTemplate}
            </Text>
            <Touchable
              onPress={mode === "list" ? onClose : () => setMode("list")}
              style={styles.iconButton}
              accessibilityLabel={mode === "list" ? t.common.done : t.common.back}
            >
              <Text style={styles.closeX}>✕</Text>
            </Touchable>
          </View>

          {mode === "list" ? (
            <>
              <Touchable style={styles.saveDashedBtn} onPress={() => setMode("save")}>
                <Text style={styles.saveDashedText}>+ {t.scheduleAdmin.saveWeekAsTemplate}</Text>
              </Touchable>

              {isPending ? (
                <ActivityIndicator color={Colors.primary} style={styles.loading} />
              ) : (
                <FlatList
                  data={templates ?? []}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={<Text style={styles.emptyText}>{t.scheduleAdmin.noTemplates}</Text>}
                  ListFooterComponent={
                    templates && templates.length > 0 ? (
                      <Text style={styles.hint}>{t.scheduleAdmin.templateHint}</Text>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <Touchable
                      onLongPress={() => confirmDelete(item)}
                      style={[styles.templateRow, row]}
                    >
                      <View style={styles.templateText}>
                        <Text style={[styles.templateName, rtlText]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.templateDate, rtlText]}>
                          {formatMonthYear(item.sourceWeekStart, t)}
                        </Text>
                      </View>
                      <Touchable style={styles.applySmallBtn} onPress={() => onApply(item.id)}>
                        <Text style={styles.applySmallText}>{t.scheduleAdmin.apply}</Text>
                      </Touchable>
                    </Touchable>
                  )}
                />
              )}
            </>
          ) : (
            <View>
              <Text style={[styles.fieldLabel, rtlText]}>{t.scheduleAdmin.templateName}</Text>
              <TextInput
                style={[styles.nameInput, rtlText]}
                value={name}
                onChangeText={setName}
                maxLength={40}
                autoFocus
              />
              <Text style={[styles.fromWeek, rtlText]}>
                {t.scheduleAdmin.fromWeek(formatWeekRange(weekStart, t))}
              </Text>
              {!weekHasActivities ? (
                <Text style={[styles.emptyWeek, rtlText]}>{t.scheduleAdmin.emptyWeek}</Text>
              ) : null}

              <Touchable
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                disabled={!canSave}
                onPress={() => save.mutate()}
              >
                {save.isPending ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.saveBtnText}>{t.common.save}</Text>
                )}
              </Touchable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 19, color: Colors.text },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeX: { fontSize: 20, color: Colors.textLight },
  saveDashedBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 18,
  },
  saveDashedText: { fontFamily: Fonts.bold, fontSize: 13.5, color: Colors.primary },
  loading: { paddingVertical: 24 },
  separator: { height: 8 },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 13,
  },
  templateText: { flex: 1, minWidth: 0 },
  templateName: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.text, marginBottom: 2 },
  templateDate: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textLight },
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
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    textAlign: "center",
    paddingVertical: 24,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 14,
  },
  fieldLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight, marginBottom: 6 },
  nameInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
  },
  fromWeek: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textLight, marginBottom: 22 },
  emptyWeek: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.rose, marginTop: -12, marginBottom: 18 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.background },
});
