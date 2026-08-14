import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, Share, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { createInvite, Invite, listInvites, revokeInvite } from "../../services/inviteApi";
import { DataErrorState } from "../ui/DataErrorState";
import { SkeletonBlock } from "../ui/Skeleton";
import { Touchable } from "../ui/Touchable";

const STATUS_TINT: Record<Invite["status"], string> = {
  active: Colors.forest,
  spent: Colors.textLight,
  revoked: Colors.clay,
  expired: Colors.textLight,
};

/**
 * The admin's half of the invite flow: generate a code for a child, hand it to
 * their family, revoke it if it goes astray.
 *
 * Codes travel by WhatsApp in practice, so sharing is a first-class action
 * rather than something to copy by hand off a screen.
 */
export function InviteCodesSection({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: invites,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["invites", studentId],
    queryFn: () => listInvites(studentId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["invites", studentId] });

  const generate = useMutation({
    mutationFn: () => createInvite({ studentId }),
    onSuccess: refresh,
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: refresh,
    onError: () => Alert.alert(t.common.somethingWentWrong, t.common.tryAgain),
  });

  const confirmRevoke = (inviteId: string) =>
    Alert.alert(t.invite.adminRevoke, t.invite.adminRevokeConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.invite.adminRevoke,
        style: "destructive",
        onPress: () => revoke.mutate(inviteId),
      },
    ]);

  const share = (code: string) =>
    Share.share({ message: t.invite.adminShareMessage(studentName, code) });

  const statusLabel = (status: Invite["status"]) =>
    status === "active"
      ? t.invite.statusActive
      : status === "spent"
        ? t.invite.statusSpent
        : status === "revoked"
          ? t.invite.statusRevoked
          : t.invite.statusExpired;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, rtlText]}>{t.invite.adminTitle}</Text>

      {isPending ? (
        <SkeletonBlock width="100%" height={54} borderRadius={12} />
      ) : isError || !invites ? (
        <DataErrorState compact onRetry={() => void refetch()} />
      ) : invites.length === 0 ? (
        <Text style={[styles.empty, rtlText]}>{t.invite.adminNoCodes}</Text>
      ) : (
        invites.map((invite) => (
          <View key={invite.id} style={styles.row}>
            <View style={[styles.rowTop, isRTL && styles.rowReverse]}>
              <Text style={styles.code}>{invite.code}</Text>
              <View style={[styles.chip, { backgroundColor: `${STATUS_TINT[invite.status]}1F` }]}>
                <Text style={[styles.chipText, { color: STATUS_TINT[invite.status] }]}>
                  {statusLabel(invite.status)}
                </Text>
              </View>
            </View>

            <View style={[styles.rowBottom, isRTL && styles.rowReverse]}>
              <Text style={[styles.uses, rtlText]}>{t.invite.adminUsesLeft(invite.usesLeft)}</Text>
              <View style={[styles.actions, isRTL && styles.rowReverse]}>
                {invite.status === "active" ? (
                  <>
                    <Touchable onPress={() => share(invite.code)} hitSlop={8}>
                      <Text style={styles.action}>{t.invite.adminShare}</Text>
                    </Touchable>
                    <Touchable
                      onPress={() => confirmRevoke(invite.id)}
                      hitSlop={8}
                      disabled={revoke.isPending}
                    >
                      {revoke.isPending && revoke.variables === invite.id ? (
                        <ActivityIndicator color={Colors.clay} />
                      ) : (
                        <Text style={[styles.action, styles.destructive]}>
                          {t.invite.adminRevoke}
                        </Text>
                      )}
                    </Touchable>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        ))
      )}

      <Touchable
        style={styles.generate}
        onPress={() => generate.mutate()}
        disabled={generate.isPending}
      >
        {generate.isPending ? (
          <ActivityIndicator color={Colors.terracotta} />
        ) : (
          <Text style={styles.generateText}>+ {t.invite.adminGenerate}</Text>
        )}
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.bark,
    marginBottom: 10,
  },
  empty: { ...Type.caption, color: Colors.textLight, marginBottom: 4 },
  row: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rowReverse: { flexDirection: "row-reverse" },
  code: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.text,
  },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: Fonts.bold, fontSize: 11 },
  uses: { ...Type.caption, color: Colors.textLight },
  actions: { flexDirection: "row", gap: 16 },
  action: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.terracotta },
  destructive: { color: Colors.clay },
  generate: { paddingVertical: 10, alignItems: "center" },
  generateText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.forest },
});
