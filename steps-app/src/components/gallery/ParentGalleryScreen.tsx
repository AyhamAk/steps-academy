import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getGalleryQuote,
  isPhotoTaggedWithAny,
  myGallery,
  Photo,
  resolvePhotoUrl,
} from "../../services/galleryApi";
import { useChildren } from "../../store/authStore";
import { formatIsoDate } from "../../utils/date";
import { SkeletonEventList } from "../ui/Skeleton";
import AdminHeader from "../admin/AdminHeader";
import ChildTag from "./ChildTag";
import { ScreenFadeIn } from "../ui/ScreenFadeIn";
import { StepsButton } from "../ui/StepsButton";
import { StepsCard } from "../ui/StepsCard";
import { EmptyState } from "./EmptyState";
import { EventCaption } from "./EventCaption";
import { FullscreenPhotoViewer } from "./FullscreenPhotoViewer";
import { Touchable } from "../ui/Touchable";

const EVENT_BORDER_COLORS = [Colors.terracotta, Colors.forest, Colors.sky, Colors.honey];

type ViewerState = { photos: Photo[]; index: number; albumId: string };

function TaggedThumb({
  photo,
  size,
  tagged,
  onPress,
}: {
  photo: Photo;
  size: number;
  tagged: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable onPress={onPress}>
      <Image
        source={{ uri: resolvePhotoUrl(photo.url) }}
        style={[styles.thumb, { width: size, height: size }]}
      />
      {tagged ? <ChildTag /> : null}
    </Touchable>
  );
}

export function ParentGalleryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { t, isRTL, rtlText } = useTranslation();
  const children = useChildren();
  const childIds = children.map((child) => child.id);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const { data: groups, isError, refetch } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
  });
  const { data: quote } = useQuery({ queryKey: ["gallery", "quote"], queryFn: getGalleryQuote });

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
      >
        <ScreenFadeIn>
          <AdminHeader
            title={t.gallery.pageTitle}
            subtitle={t.gallery.parentSubtitle}
            showBack={false}
          />

          {/* A message the academy pins above every album. */}
          {quote ? (
            <View style={styles.quoteCard}>
              <View style={[styles.quoteHeader, isRTL && styles.rowReverse]}>
                <View style={styles.quoteAvatar}>
                  <Text style={styles.quoteAvatarEmoji}>🐘</Text>
                </View>
                <Text style={[styles.quoteFrom, rtlText]}>{t.gallery.quoteFrom}</Text>
                <Text style={styles.quoteMark}>“</Text>
              </View>

              <Text style={[styles.quoteText, rtlText]}>{quote}</Text>
            </View>
          ) : null}

          {isError ? (
            <>
              <EmptyState
                emoji="⚠️"
                title={t.gallery.couldntLoadPhotos}
                subtitle={t.gallery.checkConnection}
              />
              <StepsButton
                label={t.gallery.refresh}
                variant="outline"
                onPress={() => refetch()}
                style={styles.refreshButton}
              />
            </>
          ) : !groups ? (
            <SkeletonEventList count={3} />
          ) : (
            <>
              {groups.length === 0 ? (
                <EmptyState
                  title={t.gallery.noPhotosYetParent}
                  subtitle={t.gallery.noPhotosYetParentSubtitle}
                />
              ) : (
                groups.map((group, index) => (
                  <StepsCard
                    key={group.event.id}
                    onPress={() => router.push(`/gallery/${group.event.id}`)}
                    style={styles.eventCard}
                  >
                    {/* Bar and body share a row, so the bar cannot overrun the
                        card's rounded corner the way an absolute one did. */}
                    <View style={styles.eventRow}>
                      <View
                        style={[
                          styles.eventAccentBar,
                          {
                            backgroundColor:
                              EVENT_BORDER_COLORS[index % EVENT_BORDER_COLORS.length],
                          },
                        ]}
                      />
                      <View style={styles.eventBody}>
                        <View style={[styles.eventHeaderRow, isRTL && styles.rowReverse]}>
                          <View style={styles.eventTextBlock}>
                            <Text style={[styles.eventName, rtlText]} maxFontSizeMultiplier={1.3}>{group.event.name}</Text>
                            <Text style={[styles.eventMeta, rtlText]} maxFontSizeMultiplier={1.4}>
                              {t.gallery.parentEventMeta(
                                formatIsoDate(group.event.date, t),
                                group.photos.length
                              )}
                            </Text>
                          </View>
                          <Text style={styles.eventChevron}>{isRTL ? "‹" : "›"}</Text>
                        </View>

                        <EventCaption caption={group.event.caption} />

                        {group.photos.length === 0 ? (
                          <Text style={styles.stripEmpty} maxFontSizeMultiplier={1.4}>{t.gallery.noPhotosYetCard}</Text>
                        ) : (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.strip}
                            contentContainerStyle={[
                              styles.stripContent,
                              isRTL && styles.rowReverse,
                            ]}
                          >
                            {group.photos.slice(0, 10).map((photo, photoIndex) => (
                              <TaggedThumb
                                key={photo.id}
                                photo={photo}
                                size={88}
                                tagged={isPhotoTaggedWithAny(photo, childIds)}
                                onPress={() =>
                                  setViewer({
                                    photos: group.photos,
                                    index: photoIndex,
                                    albumId: group.event.id,
                                  })
                                }
                              />
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    </View>
                  </StepsCard>
                ))
              )}
            </>
          )}
        </ScreenFadeIn>
      </ScrollView>

      <FullscreenPhotoViewer
        albumId={viewer?.albumId}
        photos={viewer?.photos ?? null}
        initialIndex={viewer?.index ?? 0}
        childIds={childIds}
        onClose={() => setViewer(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 0,
    overflow: "hidden",
  },
  eventRow: { flexDirection: "row" },
  eventAccentBar: { width: 4 },
  eventBody: { flex: 1, padding: 16 },
  eventHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  eventTextBlock: { flex: 1 },
  eventName: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.bark,
    writingDirection: "auto",
  },
  eventMeta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginTop: 2,
    writingDirection: "auto",
  },
  eventChevron: { fontSize: 22, color: Colors.textLight },
  quoteCard: {
    backgroundColor: Colors.linen,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  quoteHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  quoteAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.terracotta}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteAvatarEmoji: { fontSize: 15 },
  quoteFrom: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
  },
  quoteMark: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.honey },
  quoteText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.bark,
    writingDirection: "auto",
  },
  strip: { marginTop: 12 },
  stripContent: { gap: 8 },
  stripEmpty: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textLight,
    textAlign: "center",
    paddingVertical: 20,
  },
  thumb: { borderRadius: 12, backgroundColor: Colors.linen },
  content: {
    paddingBottom: 40,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  refreshButton: {
    marginTop: 16,
    alignSelf: "center",
  },
});
