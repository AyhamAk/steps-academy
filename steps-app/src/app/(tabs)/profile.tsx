import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChangePasswordModal } from "../../components/profile/ChangePasswordModal";
import { ContactAcademyModal } from "../../components/profile/ContactAcademyModal";
import { MyCoursesSection } from "../../components/profile/MyCoursesSection";
import IconTile from "../../components/admin/IconTile";
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
      >
        <ScreenFadeIn>
        <StepsCard style={styles.identityCard} elevation="flat">
          <View
            style={[styles.identityDecor, isRTL ? styles.identityDecorRTL : styles.identityDecorLTR]}
            pointerEvents="none"
          />
          <View style={styles.identityAvatar}>
            <Text style={styles.identityAvatarEmoji}>👩</Text>
          </View>
          <View style={[styles.identityNameRow, isRTL && styles.rowReverse]}>
            <Text style={styles.identityName}>{user?.name}</Text>
            {user?.role ? (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: user.role === "admin" ? Colors.terracotta : Colors.forest },
                ]}
              >
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.identityEmail}>{user?.email}</Text>
        </StepsCard>

        {children.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, rtlText]}>{t.profile.myKidsTitle}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kidsStrip}
            >
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Touchable
                    key={child.id}
                    style={[styles.kidCard, isSelected && styles.kidCardSelected]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <View style={styles.kidAvatar}>
                      <Text style={styles.kidAvatarEmoji}>🐘</Text>
                    </View>
                    <Text style={styles.kidName}>{child.name}</Text>
                  </Touchable>
                );
              })}
            </ScrollView>

            {selectedChildId ? (
              <View style={[styles.dashCard, isRTL ? styles.dashCardAccentRTL : styles.dashCardAccentLTR]}>
                <View style={[styles.dashRow, isRTL && styles.dashRowRTL]}>
                  <Text style={styles.dashEmoji}>📸</Text>
                  {isGalleryPending ? (
                    <SkeletonBlock width="55%" height={14} />
                  ) : (
                    <Text style={[styles.dashText, rtlText]}>
                      {t.profile.photosThisMonth(photosThisMonthByChild.get(selectedChildId) ?? 0)}
                    </Text>
                  )}
                </View>
                <View style={[styles.dashRow, styles.dashRowLast, isRTL && styles.dashRowRTL]}>
                  <Text style={styles.dashEmoji}>🖼️</Text>
                  <Text style={[styles.dashText, styles.dashTextAccent, rtlText]}>
                    {t.profile.viewInGallery}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {user?.role === "admin" ? null : <MyCoursesSection />}

        <View style={styles.prefsGroup}>
          <Text style={[styles.prefsGroupTitle, rtlText]}>{t.profile.preferencesTitle}</Text>

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
                      <Text style={styles.badgeText}>{row.badge > 99 ? "99+" : row.badge}</Text>
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
        <View style={styles.legalRow}>
          <Touchable
            onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}
            style={styles.legalButton}
          >
            <Text style={styles.legalText}>{t.profile.privacyPolicy}</Text>
          </Touchable>
          <Text style={styles.legalSeparator}>·</Text>
          <Touchable onPress={confirmDeleteAccount} style={styles.legalButton}>
            <Text style={styles.deleteAccountText}>{t.profile.deleteAccount}</Text>
          </Touchable>
        </View>

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
    paddingTop: 20,
    paddingBottom: 40,
  },
  identityCard: {
    alignItems: "center",
    paddingVertical: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  identityDecor: {
    position: "absolute",
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${Colors.terracotta}14`,
  },
  identityDecorLTR: {
    right: -40,
  },
  identityDecorRTL: {
    left: -40,
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
  identityAvatarEmoji: {
    fontSize: 40,
  },
  identityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  identityName: {
    ...Type.heading,
    color: Colors.bark,
    letterSpacing: -0.3,
  },
  identityEmail: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.cream,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.bark,
    marginBottom: 12,
  },
  kidsStrip: {
    gap: 12,
    paddingEnd: 8,
  },
  kidCard: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.linen,
    borderRadius: 40,
    height: 60,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kidCardSelected: {
    borderWidth: 2,
    borderColor: Colors.terracotta,
  },
  pressedFeedback: {
    opacity: 0.75,
  },
  kidAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.terracotta}26`,
    alignItems: "center",
    justifyContent: "center",
  },
  kidAvatarEmoji: {
    fontSize: 20,
  },
  kidName: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.bark,
  },
  dashCard: {
    marginTop: 12,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dashCardAccentLTR: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.honey,
  },
  dashCardAccentRTL: {
    borderRightWidth: 4,
    borderRightColor: Colors.honey,
  },
  dashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dashRowRTL: {
    flexDirection: "row-reverse",
  },
  dashRowLast: {
    borderBottomWidth: 0,
  },
  dashEmoji: {
    fontSize: 17,
    width: 28,
    textAlign: "center",
  },
  dashText: {
    ...Type.caption,
    color: Colors.bark,
    flex: 1,
  },
  dashTextAccent: {
    color: Colors.terracotta,
    fontFamily: Fonts.semiBold,
  },
  prefsGroup: {
    marginTop: 24,
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  prefsGroupTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.bark,
    marginBottom: 16,
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
  settingsRowPressed: {
    backgroundColor: Colors.cream,
  },
  settingsRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsRowInnerRTL: {
    flexDirection: "row-reverse",
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.bark,
    flexGrow: 1,
    flexShrink: 1,
  },
  settingsChevron: {
    fontSize: 20,
    color: Colors.textLight,
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
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  legalButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  legalText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight },
  legalSeparator: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight },
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
