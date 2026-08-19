import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChangePasswordModal } from "../../components/profile/ChangePasswordModal";
import { ContactAcademyModal } from "../../components/profile/ContactAcademyModal";
import { MyCoursesSection } from "../../components/profile/MyCoursesSection";
import IconTile from "../../components/ui/IconTile";
import RoleBadge from "../../components/ui/RoleBadge";
import SectionLabel from "../../components/ui/SectionLabel";
import { Screen } from "../../components/Screen";
import { LanguagePicker } from "../../components/ui/LanguagePicker";
import { ScreenFadeIn } from "../../components/ui/ScreenFadeIn";
import { SkeletonBlock } from "../../components/ui/Skeleton";
import { StepsButton } from "../../components/ui/StepsButton";
import { StepsCard } from "../../components/ui/StepsCard";
import { ToastBanner, useToast } from "../../components/ui/Toast";
import { API_BASE_URL } from "../../services/api";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useAuth } from "../../hooks/useAuth";
import { applyLocaleDirection } from "../../i18n/applyLocaleDirection";
import { useTranslation } from "../../i18n/useTranslation";
import { matchedTagNames, myGallery } from "../../services/galleryApi";
import { enrollmentSummary } from "../../services/coursesApi";
import { getNotifications } from "../../services/notificationsApi";
import { Locale, useLocaleStore } from "../../store/localeStore";
import { Touchable } from "../../components/ui/Touchable";

export default function ProfileScreen() {
  const { user, logout, deleteAccount, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t, isRTL, rtlText } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { message: toastMessage, opacity: toastOpacity, showToast } = useToast();
  const children = user?.children ?? [];
  const childIds = children.map((child) => child.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(children[0]?.id ?? null);
  const [activeSheet, setActiveSheet] = useState<"password" | "contact" | null>(null);

  // Shares its cache key with Home/ParentGalleryScreen — visiting any of the
  // three warms the others, so this rarely triggers its own fetch.
  const { data: galleryGroups, isPending: isGalleryPending } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
    enabled: children.length > 0,
  });

  // Keyed by student id, so two children with the same name keep separate counts.
  const photosThisMonthByChild = useMemo(() => {
    const counts = new Map<string, number>();
    if (!galleryGroups) return counts;
    const now = new Date();
    for (const group of galleryGroups) {
      for (const photo of group.photos) {
        const uploaded = new Date(photo.uploadedAt);
        if (uploaded.getMonth() !== now.getMonth() || uploaded.getFullYear() !== now.getFullYear()) {
          continue;
        }
        for (const tag of photo.tags) {
          if (!childIds.includes(tag.studentId)) continue;
          counts.set(tag.studentId, (counts.get(tag.studentId) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [galleryGroups, childIds.join(",")]);

  const confirmDeleteAccount = () =>
    Alert.alert(t.profile.deleteAccountTitle, t.profile.deleteAccountMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.profile.deleteAccountConfirm,
        style: "destructive",
        onPress: () =>
          Alert.alert(t.profile.deleteAccountFinalTitle, t.profile.deleteAccountFinalMessage, [
            { text: t.common.cancel, style: "cancel" },
            {
              text: t.profile.deleteAccountConfirm,
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteAccount();
                } catch (error) {
                  const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data
                      ?.message ?? t.common.tryAgain;
                  Alert.alert(t.profile.deleteAccountFailed, message, [{ text: t.common.ok }]);
                }
              },
            },
          ]),
      },
    ]);

  const confirmLogout = () => {
    Alert.alert(t.profile.logoutConfirmTitle, t.profile.logoutConfirmMessage, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.profile.logOut, style: "destructive", onPress: logout },
    ]);
  };

  const roleLabel = user?.role === "admin" ? t.profile.roleAdmin : t.profile.roleParent;

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
  const unreadCount = notifications?.unreadCount ?? 0;

  // Pending course requests, badged next to the admin's requests board.
  const { data: pendingRequests } = useQuery({
    queryKey: ["enrollments", "summary"],
    queryFn: enrollmentSummary,
    enabled: user?.role === "admin",
  });

  const settingsRows: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    onPress: () => void;
    badge?: number;
  }[] = [
    // One door into the admin app rather than scattering management entries
    // through the parent-facing settings list.
    ...(user?.role === "admin"
      ? [
          {
            key: "admin",
            label: t.admin.title,
            icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
            tint: Colors.honey,
            onPress: () => router.push("/admin"),
            badge: pendingRequests,
          },
        ]
      : []),
    {
      key: "notifications",
      label: t.profile.notifications,
      icon: "notifications-outline",
      tint: Colors.terracotta,
      onPress: () => router.push("/notifications"),
      badge: unreadCount,
    },
    {
      key: "password",
      label: t.profile.changePassword,
      icon: "lock-closed-outline",
      tint: Colors.forest,
      onPress: () => setActiveSheet("password"),
    },
    {
      key: "contact",
      label: t.profile.contactAcademy,
      icon: "mail-outline",
      tint: Colors.sky,
      onPress: () => setActiveSheet("contact"),
    },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: tabBarHeight + 24 },
        ]}
      >
        <ScreenFadeIn>
        <StepsCard style={styles.identityCard} elevation="flat">
          {/* A monogram rather than a face: the old emoji assumed a gender the
              account never states. Display only - nothing is stored. */}
          <View style={styles.identityAvatar}>
            <Text style={styles.identityMonogram}>
              {(user?.name ?? "").trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.identityNameRow, isRTL && styles.rowReverse]}>
            <Text style={styles.identityName} maxFontSizeMultiplier={1.3}>{user?.name}</Text>
            {user?.role ? (
              <RoleBadge
                label={roleLabel}
                color={user.role === "admin" ? Colors.terracotta : Colors.forest}
              />
            ) : null}
          </View>
          <Text style={styles.identityEmail}>{user?.email}</Text>
        </StepsCard>

        {children.length > 0 ? (
          <View>
            <SectionLabel label={t.profile.myKidsTitle} />

            {/* One child is not a choice, so no chips - the name goes in the
                card header below instead. */}
            {children.length > 1 ? (
              <View style={styles.chipRow}>
                {children.map((child) => {
                  const isActive = child.id === selectedChildId;
                  return (
                    <Touchable
                      key={child.id}
                      onPress={() => setSelectedChildId(child.id)}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={styles.chipEmoji}>🐘</Text>
                      <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                        {child.name}
                      </Text>
                    </Touchable>
                  );
                })}
              </View>
            ) : null}

            {selectedChildId ? (
              <View style={styles.dashCard}>
                <View style={styles.dashRowWrap}>
                  <View style={styles.dashAccent} />
                  <View style={styles.dashBody}>
                    {children.length === 1 ? (
                      <View style={[styles.dashHeader, isRTL && styles.rowReverse]}>
                        <Text style={styles.chipEmoji}>🐘</Text>
                        <Text style={styles.dashChildName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                          {children[0].name}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.dashRow, isRTL && styles.rowReverse]}>
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={Colors.textLight}
                        style={styles.dashIcon}
                      />
                      {isGalleryPending ? (
                        <SkeletonBlock width="55%" height={14} />
                      ) : (
                        <Text style={[styles.dashText, rtlText]} maxFontSizeMultiplier={1.4}>
                          {t.profile.photosThisMonth(
                            photosThisMonthByChild.get(selectedChildId) ?? 0
                          )}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.dashRow, styles.dashRowLast, isRTL && styles.rowReverse]}>
                      <Ionicons
                        name="images-outline"
                        size={18}
                        color={Colors.terracotta}
                        style={styles.dashIcon}
                      />
                      <Text style={[styles.dashText, styles.dashTextAccent, rtlText]} maxFontSizeMultiplier={1.4}>
                        {t.profile.viewInGallery}
                      </Text>
                      <Ionicons
                        name={isRTL ? "chevron-back" : "chevron-forward"}
                        size={16}
                        color={Colors.textLight}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {user?.role === "admin" ? null : <MyCoursesSection />}

        <View style={styles.prefsGroup}>
          <SectionLabel label={t.profile.preferencesTitle} />

          <Text style={[styles.prefsSubLabel, rtlText]}>{t.profile.language}</Text>
          <LanguagePicker />

          <Text style={[styles.prefsSubLabel, styles.prefsSubLabelSpaced, rtlText]}>
            {t.profile.settingsTitle}
          </Text>
          {settingsRows.map((row) => (
            <Touchable
              key={row.key}
              style={[styles.settingsRow]}
              onPress={row.onPress}
            >
              <View style={[styles.settingsRowInner, isRTL && styles.settingsRowInnerRTL]}>
                <IconTile tint={row.tint} size={36}>
                  <Ionicons name={row.icon} size={18} color={row.tint} />
                </IconTile>
                <View style={[styles.settingsRowBody, isRTL && styles.settingsRowBodyRTL]}>
                  <Text
                    style={[styles.settingsLabel, rtlText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {row.label}
                  </Text>
                  {row.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} maxFontSizeMultiplier={1.4}>{row.badge > 99 ? "99+" : row.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={Colors.textLight}
                  />
                </View>
              </View>
            </Touchable>
          ))}
        </View>

        <StepsButton
          label={isLoading ? t.profile.loggingOut : t.profile.logOut}
          variant="outline"
          onPress={confirmLogout}
          style={styles.logoutButton}
        />

        {/* Both required by the app stores: a reachable policy, and a way to
            delete the account from inside the app. */}
        <Touchable
          onPress={() => Linking.openURL(API_BASE_URL + "/privacy")}
          style={styles.legalButton}
        >
          <Text style={styles.legalText}>{t.profile.privacyPolicy}</Text>
        </Touchable>
        {/* On its own line: deleting an account is irreversible and should not
            sit beside a policy link as though the two were equivalent. */}
        <Touchable onPress={confirmDeleteAccount} style={styles.deleteAccountButton}>
          <Text style={styles.deleteAccountText}>{t.profile.deleteAccount}</Text>
        </Touchable>

        <View style={styles.mascotFooter}>
          <Text style={styles.mascotEmoji}>🐘</Text>
          <Text style={styles.mascotText}>{t.profile.mascotTagline}</Text>
        </View>
        </ScreenFadeIn>
      </ScrollView>

      <ToastBanner message={toastMessage} opacity={toastOpacity} />

      <ChangePasswordModal
        visible={activeSheet === "password"}
        onClose={() => setActiveSheet(null)}
        onSuccess={showToast}
      />
      <ContactAcademyModal
        visible={activeSheet === "contact"}
        onClose={() => setActiveSheet(null)}
        onError={showToast}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  identityCard: {
    alignItems: "center",
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  identityAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${Colors.terracotta}26`,
    borderWidth: 3,
    borderColor: `${Colors.terracotta}40`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  identityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  identityName: {
    fontFamily: Fonts.extraBold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.bark,
    letterSpacing: -0.3,
    writingDirection: "auto",
  },
  identityMonogram: {
    fontFamily: Fonts.extraBold,
    fontSize: 34,
    color: Colors.terracotta,
  },
  identityEmail: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: `${Colors.terracotta}18`, borderColor: Colors.terracotta },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.textLight },
  chipLabelActive: { color: Colors.bark },
  dashCard: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  dashRowWrap: { flexDirection: "row" },
  dashAccent: { width: 4, backgroundColor: Colors.honey },
  dashBody: { flex: 1, paddingHorizontal: 16, paddingVertical: 4 },
  dashHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 12,
  },
  dashChildName: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.bark,
    writingDirection: "auto",
  },
  dashRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dashRowLast: { borderBottomWidth: 0 },
  dashIcon: { width: 24 },
  dashText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.bark,
  },
  dashTextAccent: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.terracotta },
  prefsGroup: {
    marginTop: 24,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  prefsSubLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  prefsSubLabelSpaced: {
    marginTop: 20,
  },
  settingsRow: {},
  rowReverse: { flexDirection: "row-reverse" },
  settingsRowBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  settingsRowBodyRTL: {
    flexDirection: "row-reverse",
  },
  settingsRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsRowInnerRTL: {
    flexDirection: "row-reverse",
  },
  settingsLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.bark,
    flexGrow: 1,
    flexShrink: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.cream,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: `${Colors.terracotta}0D`,
    height: 54,
    justifyContent: "center",
  },
  legalButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  legalText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight },
  deleteAccountButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  deleteAccountText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.clay },
  mascotFooter: {
    alignItems: "center",
    marginTop: 28,
  },
  mascotEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  mascotText: {
    ...Type.caption,
    color: Colors.textLight,
    letterSpacing: 0.3,
  },
});
