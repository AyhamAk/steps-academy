import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { TipFormModal } from "../../components/tips/TipFormModal";
import { TipReaderModal } from "../../components/tips/TipReaderModal";
import { DataErrorState } from "../../components/ui/DataErrorState";
import { ScreenFadeIn } from "../../components/ui/ScreenFadeIn";
import SectionLabel from "../../components/ui/SectionLabel";
import { SkeletonBlock } from "../../components/ui/Skeleton";
import { StepsHeader } from "../../components/ui/StepsHeader";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import {
  createTip,
  deleteTip,
  listAllTips,
  listTips,
  markTipRead,
  Tip,
  TipInput,
  updateTip,
} from "../../services/tipsApi";
import { useAuthStore } from "../../store/authStore";
import { tipExcerpt, tipTitle } from "../../utils/tipText";

/**
 * The academy's monthly parenting tip, plus everything published before it.
 *
 * One tip a month means the newest deserves a card and the rest a list, rather
 * than a uniform feed where this month's tip looks like any other. Admins see
 * their drafts here too, marked as such, so there is one place to write and
 * read rather than a separate management screen for four items a year.
 */
export default function ParentingTipsScreen() {
  const { t, isRTL, locale } = useTranslation();
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin";
  const queryClient = useQueryClient();

  const [reading, setReading] = useState<Tip | null>(null);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Admins read their own list so drafts are visible; parents get published
  // tips only, which the server enforces rather than the client.
  const { data: tips, isPending, isError, refetch } = useQuery({
    queryKey: ["tips", isAdmin ? "all" : "published"],
    queryFn: isAdmin ? listAllTips : listTips,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tips"] });

  const saveMutation = useMutation({
    mutationFn: (input: TipInput) =>
      editing ? updateTip(editing.id, input) : createTip(input),
    onSuccess: () => {
      setIsFormOpen(false);
      setEditing(null);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTip,
    onSuccess: invalidate,
  });

  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const openTip = (tip: Tip) => {
    setReading(tip);
    // Fire-and-forget: a failed read mark is not worth interrupting reading
    // for, and the next list refresh corrects it.
    if (!tip.read) {
      markTipRead(tip.id)
        .then(invalidate)
        .catch(() => {});
    }
  };

  const confirmDelete = (tip: Tip) => {
    Alert.alert(t.tipsAdmin.deleteTitle, t.tipsAdmin.deleteMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.tipsAdmin.delete,
        style: "destructive",
        onPress: () => deleteMutation.mutate(tip.id),
      },
    ]);
  };

  /**
   * Month and duration as separate Text nodes, never one joined string.
   *
   * Concatenating a translated month, a digit and a "·" lets the bidi
   * algorithm move the separator — the same bug that misplaced punctuation in
   * gallery captions. Separate nodes in a direction-aware row cannot reorder.
   */
  const MetaLine = ({ tip }: { tip: Tip }) => (
    <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
      <Text style={styles.tipMeta} maxFontSizeMultiplier={1.3}>
        {t.common.months[tip.month - 1]}
      </Text>
      <Text style={styles.tipMeta} maxFontSizeMultiplier={1.3}>
        ·
      </Text>
      <Text style={styles.tipMeta} maxFontSizeMultiplier={1.3}>
        {t.tips.minShort(tip.minutes)}
      </Text>
      {isAdmin && !tip.isPublished ? (
        <View style={styles.draftPill}>
          <Text style={styles.draftText} maxFontSizeMultiplier={1.2}>
            {t.tips.draft}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const featured = tips?.[0];
  const archive = tips?.slice(1) ?? [];
  const featuredExcerpt = featured ? tipExcerpt(featured, locale) : "";

  return (
    <Screen safeBottom>
      <ScreenFadeIn>
        <StepsHeader
          title={t.academy.tipsHeading}
          showBack
          actionLabel={isAdmin ? t.tipsAdmin.addTip : undefined}
          onActionPress={
            isAdmin
              ? () => {
                  setEditing(null);
                  setIsFormOpen(true);
                }
              : undefined
          }
        />

        {isPending ? (
          <View style={styles.loading}>
            <SkeletonBlock width="100%" height={150} borderRadius={16} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} />
            <SkeletonBlock width="100%" height={64} borderRadius={14} />
          </View>
        ) : isError || !tips ? (
          <DataErrorState onRetry={() => void refetch()} />
        ) : tips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💡</Text>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.3}>
              {t.tips.emptyTitle}
            </Text>
            <Text style={styles.emptySubtitle} maxFontSizeMultiplier={1.3}>
              {isAdmin ? t.tips.adminEmpty : t.tips.emptySubtitle}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { textAlign }]} maxFontSizeMultiplier={1.3}>
              {t.tips.subtitle}
            </Text>

            {featured ? (
              <View style={styles.featuredCard}>
                <View style={[styles.featuredBadgeRow, { flexDirection: rowDirection }]}>
                  <View style={styles.monthPill}>
                    <Text style={styles.monthPillText} maxFontSizeMultiplier={1.2}>
                      {t.common.months[featured.month - 1]}
                    </Text>
                  </View>
                  <Text style={styles.newLabel} maxFontSizeMultiplier={1.2}>
                    {isAdmin && !featured.isPublished ? t.tips.draft : t.tips.new}
                  </Text>
                </View>

                <View style={[styles.featuredBody, { flexDirection: rowDirection }]}>
                  <View style={styles.emojiTileLarge}>
                    <Text style={styles.emojiLarge}>{featured.emoji}</Text>
                  </View>
                  <View style={styles.featuredTextCol}>
                    <Text style={[styles.featuredTitle, { textAlign }]} maxFontSizeMultiplier={1.3}>
                      {tipTitle(featured, locale)}
                    </Text>
                    {/* Closes up rather than leaving a blank line when the
                        academy wrote no excerpt for this one. */}
                    {featuredExcerpt ? (
                      <Text
                        style={[styles.featuredExcerpt, { textAlign }]}
                        numberOfLines={2}
                        maxFontSizeMultiplier={1.3}
                      >
                        {featuredExcerpt}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.featuredFooter, { flexDirection: rowDirection }]}>
                  <Text style={styles.readTime} maxFontSizeMultiplier={1.3}>
                    {t.tips.minRead(featured.minutes)}
                  </Text>
                  <View style={[styles.actions, { flexDirection: rowDirection }]}>
                    {isAdmin ? (
                      <AdminActions
                        onEdit={() => {
                          setEditing(featured);
                          setIsFormOpen(true);
                        }}
                        onDelete={() => confirmDelete(featured)}
                        editLabel={t.common.save}
                        deleteLabel={t.tipsAdmin.delete}
                      />
                    ) : null}
                    <Pressable
                      onPress={() => openTip(featured)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t.tips.read}
                      style={styles.readCta}
                    >
                      <Text style={styles.readCtaText} maxFontSizeMultiplier={1.3}>
                        {t.tips.read}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            {archive.length > 0 ? (
              <>
                <SectionLabel label={t.tips.earlier} />
                {archive.map((tip) => (
                  <Pressable
                    key={tip.id}
                    onPress={() => openTip(tip)}
                    onLongPress={isAdmin ? () => confirmDelete(tip) : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={tipTitle(tip, locale)}
                    style={[styles.tipRow, { flexDirection: rowDirection }]}
                  >
                    <View style={styles.emojiTile}>
                      <Text style={styles.emoji}>{tip.emoji}</Text>
                    </View>
                    <View style={styles.tipRowText}>
                      <Text
                        style={[styles.tipTitle, { textAlign }]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                      >
                        {tipTitle(tip, locale)}
                      </Text>
                      <MetaLine tip={tip} />
                    </View>
                    {isAdmin ? (
                      <Pressable
                        onPress={() => {
                          setEditing(tip);
                          setIsFormOpen(true);
                        }}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t.tipsAdmin.editTitle}
                        style={styles.iconButton}
                      >
                        <Text style={styles.iconButtonText}>✎</Text>
                      </Pressable>
                    ) : tip.read ? (
                      <Text style={styles.readCheck}>✓</Text>
                    ) : (
                      <View style={styles.unreadDot} />
                    )}
                  </Pressable>
                ))}
              </>
            ) : null}
          </ScrollView>
        )}

        <TipReaderModal tip={reading} onClose={() => setReading(null)} />

        <TipFormModal
          visible={isFormOpen}
          tip={editing}
          isSaving={saveMutation.isPending}
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={(input) => saveMutation.mutate(input)}
        />
      </ScreenFadeIn>
    </Screen>
  );
}

/** Edit and delete, sized to the 44pt minimum like every other control here. */
function AdminActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}) {
  return (
    <>
      <Pressable
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        style={styles.iconButton}
      >
        <Text style={styles.iconButtonText}>✎</Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        style={styles.iconButton}
      >
        <Text style={[styles.iconButtonText, styles.deleteIcon]}>🗑</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  // A pushed stack route, so there is no tab bar to clear — only the home
  // indicator, which `Screen safeBottom` already reserves.
  scroll: { paddingBottom: 24 },
  loading: { gap: 12 },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 18,
  },
  featuredCard: {
    backgroundColor: Colors.honeyLight,
    borderWidth: 1,
    borderColor: Colors.honey,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  featuredBadgeRow: { alignItems: "center", gap: 8, marginBottom: 10 },
  monthPill: {
    backgroundColor: Colors.honey,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  monthPillText: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.cream },
  newLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.bark, opacity: 0.7 },
  featuredBody: { gap: 12, alignItems: "flex-start" },
  emojiTileLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiLarge: { fontSize: 24 },
  featuredTextCol: { flex: 1, minWidth: 0 },
  featuredTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.bark,
    marginBottom: 4,
    lineHeight: 21,
  },
  featuredExcerpt: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
  },
  featuredFooter: { marginTop: 12, alignItems: "center", justifyContent: "space-between" },
  actions: { alignItems: "center", gap: 4 },
  readTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textLight },
  readCta: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  readCtaText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.terracotta },
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonText: { fontSize: 17, color: Colors.textLight },
  deleteIcon: { color: Colors.clay },
  tipRow: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    minHeight: 44,
  },
  emojiTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  tipRowText: { flex: 1, minWidth: 0 },
  tipTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.bark },
  metaRow: { alignItems: "center", gap: 4, marginTop: 2 },
  tipMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textLight },
  draftPill: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.honey,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  draftText: { fontFamily: Fonts.semiBold, fontSize: 10, color: Colors.honeyDeep },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.terracotta },
  readCheck: { fontSize: 16, color: Colors.forest },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.bark,
    marginBottom: 4,
  },
  emptySubtitle: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textLight },
});
