import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

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
import { parseRosterPaste, toWhatsAppNumber } from "../lib/phone";
import { bulkCreateInvites, Invite, listInvites, markInviteSent } from "../services/inviteApi";
import { bulkCreateStudents } from "../services/studentsApi";

type SendState = "notSent" | "waiting" | "signedUp";

function sendState(invite: Invite): SendState {
  if (invite.redeemedCount > 0) return "signedUp";
  return invite.sentAt ? "waiting" : "notSent";
}

// Unsent first, then sent-but-waiting, then done — so the screen always opens
// on the work that's left, and turns into the chase list by itself.
const ORDER: Record<SendState, number> = { notSent: 0, waiting: 1, signedUp: 2 };

/**
 * The admin's distribution screen: paste the class in, generate every code at
 * once, then tap down the list sending each family their own code on WhatsApp.
 *
 * Codes are per-child, so they can never be posted to the parents' group —
 * one code in a shared place would let any parent claim another child.
 */
export default function InviteSendScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();
  const [paste, setPaste] = useState("");

  const {
    data: invites,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["invites"], queryFn: () => listInvites() });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["invites"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const parsed = useMemo(() => parseRosterPaste(paste), [paste]);

  const importStudents = useMutation({
    mutationFn: () => bulkCreateStudents(parsed),
    onSuccess: ({ createdCount, skippedCount }) => {
      setPaste("");
      refresh();
      Alert.alert(t.invite.importTitle, t.invite.importResult(createdCount, skippedCount));
    },
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const generateAll = useMutation({
    mutationFn: bulkCreateInvites,
    onSuccess: (createdCount) => {
      refresh();
      Alert.alert(t.invite.adminTitle, t.invite.generateAllResult(createdCount));
    },
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const markSent = useMutation({
    mutationFn: (inviteId: string) => markInviteSent(inviteId),
    onSuccess: refresh,
  });

  const active = useMemo(
    () => (invites ?? []).filter((invite) => invite.status === "active"),
    [invites]
  );

  const sorted = useMemo(
    () =>
      [...active].sort((a, b) => {
        const byState = ORDER[sendState(a)] - ORDER[sendState(b)];
        return byState !== 0 ? byState : a.studentName.localeCompare(b.studentName);
      }),
    [active]
  );

  const outstanding = active.filter((invite) => invite.redeemedCount === 0).length;

  const send = async (invite: Invite) => {
    const message = t.invite.adminShareMessage(invite.studentName, invite.code);
    const number = toWhatsAppNumber(invite.guardianPhone);

    if (number) {
      await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
    } else {
      // No usable number — fall back to the share sheet rather than dropping
      // the family silently.
      await Share.share({ message });
    }
    markSent.mutate(invite.id);
  };

  const stateLabel = (state: SendState) =>
    state === "signedUp"
      ? t.invite.stateSignedUp
      : state === "waiting"
        ? t.invite.stateWaiting
        : t.invite.stateNotSent;

  const stateTint = (state: SendState) =>
    state === "signedUp" ? Colors.forest : state === "waiting" ? Colors.honey : Colors.textLight;

  return (
    <Screen safeBottom>
      <StepsHeader title={t.invite.sendTitle} subtitle={t.invite.sendSubtitle} showBack />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <StepsButton
          label={t.invite.generateAll}
          onPress={() => generateAll.mutate()}
          loading={generateAll.isPending}
          variant="outline"
          style={styles.generateButton}
        />

        <Text style={[styles.remaining, rtlText]}>
          {outstanding === 0 && active.length > 0
            ? t.invite.allSignedUp
            : t.invite.remaining(outstanding)}
        </Text>

        {isPending ? (
          <>
            <SkeletonBlock width="100%" height={64} borderRadius={14} style={styles.rowGap} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} style={styles.rowGap} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} />
          </>
        ) : isError || !invites ? (
          <DataErrorState onRetry={() => void refetch()} />
        ) : (
          sorted.map((invite) => {
            const state = sendState(invite);
            return (
              <View key={invite.id} style={[styles.row, isRTL && styles.rowReverse]}>
                <View style={styles.flex}>
                  <Text style={[styles.childName, rtlText]}>{invite.studentName}</Text>
                  <Text style={[styles.code, rtlText]}>{invite.code}</Text>
                  <Text style={[styles.state, { color: stateTint(state) }, rtlText]}>
                    {stateLabel(state)}
                    {invite.guardianPhone ? "" : ` · ${t.invite.noPhone}`}
                  </Text>
                </View>

                {state === "signedUp" ? null : (
                  <Touchable onPress={() => send(invite)} style={styles.sendButton} hitSlop={8}>
                    <Text style={styles.sendText}>
                      {state === "waiting" ? t.invite.resend : t.invite.send}
                    </Text>
                  </Touchable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  flex: { flex: 1 },
  importCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
  generateButton: { marginBottom: 16 },
  remaining: { ...Type.caption, color: Colors.textLight, marginBottom: 12 },
  rowGap: { marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowReverse: { flexDirection: "row-reverse" },
  childName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  code: { fontFamily: Fonts.bold, fontSize: 14, letterSpacing: 2, color: Colors.terracotta, marginTop: 2 },
  state: { ...Type.caption, marginTop: 4 },
  sendButton: {
    backgroundColor: Colors.forest,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sendText: { fontFamily: Fonts.bold, fontSize: 13, color: "#FFFFFF" },
});
