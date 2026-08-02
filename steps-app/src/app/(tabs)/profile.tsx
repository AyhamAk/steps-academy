import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "../../components/Screen";
import { ScreenFadeIn } from "../../components/ui/ScreenFadeIn";
import { StepsButton } from "../../components/ui/StepsButton";
import { StepsCard } from "../../components/ui/StepsCard";
import { ToastBanner, useToast } from "../../components/ui/Toast";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useAuth } from "../../hooks/useAuth";
import { applyLocaleDirection } from "../../i18n/applyLocaleDirection";
import { useTranslation } from "../../i18n/useTranslation";
import { matchedTagNames, myGallery } from "../../services/galleryApi";
import { Locale, useLocaleStore } from "../../store/localeStore";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
];

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const { t, isRTL, rtlText } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { message: toastMessage, opacity: toastOpacity, showToast } = useToast();
  const childNames = user?.childNames ?? [];
  const [selectedChild, setSelectedChild] = useState<string | null>(childNames[0] ?? null);

  // Shares its cache key with Home/ParentGalleryScreen — visiting any of the
  // three warms the others, so this rarely triggers its own fetch.
  const { data: galleryGroups } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
    enabled: childNames.length > 0,
  });

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
        for (const name of matchedTagNames(photo, childNames)) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [galleryGroups, childNames.join(",")]);

  const handleSelectLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    applyLocaleDirection(next);
  };

  const roleLabel = user?.role === "admin" ? t.profile.roleAdmin : t.profile.roleParent;

  const settingsRows = [
    t.profile.notifications,
    t.profile.changePassword,
    t.profile.contactAcademy,
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenFadeIn>
        <StepsCard style={styles.identityCard} elevation="featured">
          <View style={styles.identityAvatar}>
            <Text style={styles.identityAvatarEmoji}>👤</Text>
          </View>
          <Text style={styles.identityName}>{user?.name}</Text>
          <Text style={styles.identityEmail}>{user?.email}</Text>
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
        </StepsCard>

        {childNames.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, rtlText]}>{t.profile.myKidsTitle}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kidsStrip}
            >
              {childNames.map((name) => {
                const isSelected = name === selectedChild;
                return (
                  <Pressable
                    key={name}
                    style={({ pressed }) => [
                      styles.kidCard,
                      isSelected && styles.kidCardSelected,
                      pressed && styles.pressedFeedback,
                    ]}
                    onPress={() => setSelectedChild(name)}
                  >
                    <View style={styles.kidAvatar}>
                      <Text style={styles.kidAvatarEmoji}>🐘</Text>
                    </View>
                    <Text style={styles.kidName}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedChild ? (
              <StepsCard style={styles.dashboardCard} elevation="featured">
                <View
                  style={[styles.dashboardAccentBar, isRTL ? styles.accentBarRTL : styles.accentBarLTR]}
                />
                <Text style={[styles.dashboardRow, rtlText]}>
                  {t.profile.photosThisMonth(photosThisMonthByChild.get(selectedChild) ?? 0)}
                </Text>
                <Text style={[styles.dashboardLink, rtlText]}>{t.profile.viewInGallery}</Text>
              </StepsCard>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText]}>{t.profile.language}</Text>
          <View style={styles.languageRow}>
            {LANGUAGES.map(({ code, label }) => {
              const active = locale === code;
              return (
                <Pressable
                  key={code}
                  style={[styles.languagePill, active && styles.languagePillActive]}
                  onPress={() => handleSelectLocale(code)}
                >
                  <Text style={[styles.languagePillText, active && styles.languagePillTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText]}>{t.profile.settingsTitle}</Text>
          {settingsRows.map((label) => (
            <Pressable
              key={label}
              style={({ pressed }) => [
                styles.settingsRow,
                isRTL && styles.rowReverse,
                pressed && styles.pressedFeedback,
              ]}
              onPress={() => showToast(t.common.comingSoon)}
            >
              <Text style={[styles.settingsRowText, rtlText]}>{label}</Text>
              <Text style={styles.settingsChevron}>{isRTL ? "‹" : "›"}</Text>
            </Pressable>
          ))}
        </View>

        <StepsButton
          label={isLoading ? t.profile.loggingOut : t.profile.logOut}
          variant="outline"
          onPress={logout}
          style={styles.logoutButton}
        />

        <View style={styles.mascotFooter}>
          <Text style={styles.mascotEmoji}>🐘</Text>
          <Text style={styles.mascotText}>{t.profile.mascotTagline}</Text>
        </View>
        </ScreenFadeIn>
      </ScrollView>

      <ToastBanner message={toastMessage} opacity={toastOpacity} />
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
    paddingVertical: 24,
  },
  identityAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  identityAvatarEmoji: {
    fontSize: 36,
  },
  identityName: {
    ...Type.heading,
    color: Colors.bark,
  },
  identityEmail: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  section: {
    marginTop: 24,
  },
  rowReverse: {
    flexDirection: "row-reverse",
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
    backgroundColor: Colors.linen,
    borderRadius: 40,
    height: 60,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  dashboardCard: {
    marginTop: 12,
    backgroundColor: Colors.linen,
    gap: 6,
  },
  dashboardLink: {
    ...Type.caption,
    fontFamily: Fonts.semiBold,
    color: Colors.terracotta,
  },
  dashboardAccentBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: Colors.honey,
  },
  accentBarLTR: {
    left: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  accentBarRTL: {
    right: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  dashboardRow: {
    ...Type.body,
    color: Colors.bark,
  },
  languageRow: {
    flexDirection: "row",
    gap: 12,
  },
  languagePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  languagePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languagePillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  languagePillTextActive: {
    color: "#FFFFFF",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  settingsRowText: {
    ...Type.body,
    fontFamily: Fonts.semiBold,
    color: Colors.bark,
  },
  settingsChevron: {
    fontSize: 18,
    color: Colors.textLight,
  },
  logoutButton: {
    marginTop: 12,
  },
  mascotFooter: {
    alignItems: "center",
    marginTop: 28,
  },
  mascotEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  mascotText: {
    ...Type.caption,
    color: Colors.textLight,
  },
});
