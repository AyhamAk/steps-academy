import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { Screen } from "../components/Screen";
import { DataErrorState } from "../components/ui/DataErrorState";
import { SkeletonBlock } from "../components/ui/Skeleton";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsHeader } from "../components/ui/StepsHeader";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import { parseRosterPaste, toLocalDisplay, toWhatsAppNumber } from "../lib/phone";
import { bulkCreateStudents, listStudents, Student } from "../services/studentsApi";

type FamilyState = "waiting" | "noPhone" | "signedUp";

function familyState(student: Student): FamilyState {
  if (student.guardians.length > 0) return "signedUp";
  return student.guardianPhones.length > 0 ? "waiting" : "noPhone";
}

// Families still to sign up first, then children missing a number, then done —
// so the screen always opens on the work that's left.
const ORDER: Record<FamilyState, number> = { waiting: 0, noPhone: 1, signedUp: 2 };

/**
 * The admin's welcome screen: paste the class in (name and phone), then tap
 * down the list sending each family a WhatsApp message with the app links.
 *
 * There is no code to send. The number on the child is what links the parent:
 * signing in with it connects them to their child automatically, so the
 * message only has to say "get the app and sign in with this number".
 */
export default function InviteSendScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [paste, setPaste] = useState("");
  // Which numbers were messaged this visit — "Send again" rather than "Send".
  const [sent, setSent] = useState<Set<string>>(new Set());

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["students", "welcome"],
    queryFn: () => listStudents({ limit: 100 }),
  });

  const parsed = useMemo(() => parseRosterPaste(paste), [paste]);

  const importStudents = useMutation({
    mutationFn: () => bulkCreateStudents(parsed),
    onSuccess: ({ createdCount, skippedCount }) => {
      setPaste("");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      Alert.alert(t.invite.importTitle, t.invite.importResult(createdCount, skippedCount));
    },
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  // The academy's own roster only: a course family's typed-in child already
  // has its parent.
  const roster = useMemo(
    () => (data?.students ?? []).filter((student) => !student.addedByParent),
    [data]
  );

  const sorted = useMemo(
    () =>
      [...roster].sort((a, b) => {
        const byState = ORDER[familyState(a)] - ORDER[familyState(b)];
        return byState !== 0 ? byState : a.name.localeCompare(b.name);
      }),
    [roster]
  );

  const outstanding = roster.filter((student) => familyState(student) !== "signedUp").length;

  const send = async (student: Student, phone: string) => {
    const message = t.invite.welcomeMessage(student.name);
    const number = toWhatsAppNumber(phone);
    if (number) {
      await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
    } else {
      await Share.share({ message });
    }
    setSent((previous) => new Set(previous).add(phone));
  };

  const stateLabel = (state: FamilyState) =>
    state === "signedUp"
      ? t.invite.stateSignedUp
      : state === "waiting"
        ? t.invite.stateWaiting
        : t.invite.noPhone;

  const stateTint = (state: FamilyState) =>
    state === "signedUp" ? Colors.coral : state === "waiting" ? Colors.gold : Colors.textLight;

  return (
    <Screen safeBottom>
      <StepsHeader title={t.invite.sendTitle} subtitle={t.invite.sendSubtitle} showBack />

      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <View style={styles.importCard}>
          <Text style={[styles.cardTitle, rtlText]}>{t.invite.importTitle}</Text>
          <Text style={[styles.hint, rtlText]}>{t.invite.importHint}</Text>
          <TextInput
            style={styles.paste}
            placeholder={t.invite.importPlaceholder}
            placeholderTextColor={Colors.textLight}
            value={paste}
            onChangeText={setPaste}
            multiline
          />
          {parsed.length > 0 ? (
            <StepsButton
              label={`${t.invite.importButton} (${parsed.length})`}
              onPress={() => importStudents.mutate()}
              loading={importStudents.isPending}
              size="sm"
            />
          ) : null}
        </View>

        <Text style={[styles.remaining, rtlText]}>
          {outstanding === 0 && roster.length > 0
            ? t.invite.allSignedUp
            : t.invite.remaining(outstanding)}
        </Text>

        {isPending ? (
          <>
            <SkeletonBlock width="100%" height={64} borderRadius={14} style={styles.rowGap} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} style={styles.rowGap} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} />
          </>
        ) : isError || !data ? (
          <DataErrorState onRetry={() => void refetch()} />
        ) : (
          sorted.map((student) => {
            const state = familyState(student);
            return (
              <View key={student.id} style={styles.row}>
                <Text style={[styles.childName, rtlText]}>{student.name}</Text>
                <Text style={[styles.state, { color: stateTint(state) }, rtlText]}>
                  {stateLabel(state)}
                </Text>
                {state === "signedUp"
                  ? null
                  : student.guardianPhones.map((phone) => (
                      <View key={phone} style={[styles.phoneRow, isRTL && styles.rowReverse]}>
                        {/* Selectable so a long-press copies it. */}
                        <Text style={styles.phone} selectable>
                          {toLocalDisplay(phone)}
                        </Text>
                        <Touchable
                          onPress={() => send(student, phone)}
                          style={styles.sendButton}
                          hitSlop={8}
                        >
                          <Text style={styles.sendText}>
                            {sent.has(phone) ? t.invite.resend : t.invite.send}
                          </Text>
                        </Touchable>
                      </View>
                    ))}
              </View>
            );
          })
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  importCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.bark, marginBottom: 4 },
  hint: { ...Type.caption, color: Colors.textLight, marginBottom: 10 },
  paste: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    ...Type.body,
    color: Colors.text,
    marginBottom: 12,
  },
  remaining: { ...Type.caption, color: Colors.textLight, marginBottom: 12 },
  rowGap: { marginBottom: 10 },
  row: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowReverse: { flexDirection: "row-reverse" },
  childName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  // Digits read left to right in every language.
  phone: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text, writingDirection: "ltr" },
  state: { ...Type.caption, marginTop: 4 },
  sendButton: {
    backgroundColor: Colors.coral,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sendText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.white },
});
