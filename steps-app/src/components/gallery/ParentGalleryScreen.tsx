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
import { BalloonLoader } from "../ui/BalloonLoader";
import { ScreenFadeIn } from "../ui/ScreenFadeIn";
import { StepsButton } from "../ui/StepsButton";
import { StepsCard } from "../ui/StepsCard";
import { StepsHeader } from "../ui/StepsHeader";
import { EmptyState } from "./EmptyState";
import { EventCaption } from "./EventCaption";
import { FullscreenPhotoViewer } from "./FullscreenPhotoViewer";
import { Touchable } from "../ui/Touchable";

const EVENT_BORDER_COLORS = [Colors.terracotta, Colors.forest, Colors.sky, Colors.honey];

type ViewerState = { photos: Photo[]; index: number };

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
    <Touchable
      onPress={onPress}
      style={[{ marginEnd: 8 }]}
    >
      <Image
        source={{ uri: resolvePhotoUrl(photo.url) }}
        style={[styles.thumb, { width: size, height: size }]}
      />
      {tagged ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🐘</Text>
        </View>
      ) : null}
    </Touchable>
  );
}

export function ParentGalleryScreen() {
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
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenFadeIn>
          <StepsHeader title={t.gallery.pageTitle} subtitle={t.gallery.parentSubtitle} />

          {/* A message the academy pins above every album. */}
          {quote ? (
            <View style={styles.quoteCard}>
              {/* Soft blobs behind the text so the card feels like part of the
                  academy's world rather than a plain notice. */}
              <View style={[styles.quoteBlob, styles.quoteBlobTop]} pointerEvents="none" />
              <View style={[styles.quoteBlob, styles.quoteBlobBottom]} pointerEvents="none" />

              <View style={[styles.quoteHeader, isRTL && styles.rowReverse]}>
                <View style={styles.quoteAvatar}>
                  <Text style={styles.quoteAvatarEmoji}>🐘</Text>
                </View>
                <Text style={[styles.quoteFrom, rtlText]}>{t.gallery.quoteFrom}</Text>
              </View>

              <View style={[styles.quoteBody, isRTL && styles.rowReverse]}>
                <Text style={styles.quoteMark}>“</Text>
                <Text style={[styles.quoteText, rtlText]}>{quote}</Text>
              </View>

              <Text style={[styles.quoteFooter, isRTL && styles.quoteFooterRTL]}>🌸 ✨ 🎈</Text>
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
            <BalloonLoader label={t.gallery.loadingPhotos} />
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
                    <View
                      style={[
                        styles.eventAccentBar,
                        isRTL ? styles.accentBarRTL : styles.accentBarLTR,
                        { backgroundColor: EVENT_BORDER_COLORS[index % EVENT_BORDER_COLORS.length] },
                      ]}
                    />
                    <View style={[styles.eventHeaderRow, isRTL && styles.rowReverse]}>
                      <View style={styles.eventTextBlock}>
                        <Text style={[styles.eventName, rtlText]}>{group.event.name}</Text>
                        <Text style={[styles.eventMeta, rtlText]}>
                          {t.gallery.parentEventMeta(
                            formatIsoDate(group.event.date, t),
                            group.photos.length
                          )}
                        </Text>
                      </View>
                      <Text style={styles.eventChevron}>{isRTL ? "‹" : "›"}</Text>
                    </View>
                    <EventCaption caption={group.event.caption} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
                      {group.photos.slice(0, 10).map((photo, photoIndex) => (
                        <TaggedThumb
                          key={photo.id}
                          photo={photo}
                          size={72}
                          tagged={isPhotoTaggedWithAny(photo, childIds)}
                          onPress={() => setViewer({ photos: group.photos, index: photoIndex })}
                        />
                      ))}
                    </ScrollView>
                  </StepsCard>
                ))
              )}
            </>
          )}
        </ScreenFadeIn>
      </ScrollView>

      <FullscreenPhotoViewer
        photos={viewer?.photos ?? null}
        initialIndex={viewer?.index ?? 0}
        childIds={childIds}
        onClose={() => setViewer(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  eventCard: {
    marginTop: 16,
    borderRadius: 16,
  },
  eventAccentBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 6,
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
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  eventTextBlock: {
    flex: 1,
  },
  eventName: {
    ...Type.body,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  eventMeta: {
    ...Type.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  eventChevron: {
    fontSize: 22,
    color: Colors.textLight,
  },
  quoteCard: {
    backgroundColor: `${Colors.honey}1F`,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: `${Colors.honey}70`,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  quoteBlob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: `${Colors.terracotta}12`,
  },
  quoteBlobTop: { width: 120, height: 120, top: -58, end: -34 },
  quoteBlobBottom: { width: 90, height: 90, bottom: -46, start: -28, backgroundColor: `${Colors.forest}12` },
  quoteHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  quoteAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.honey}45`,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteAvatarEmoji: { fontSize: 15 },
  quoteFrom: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: "#a2801f",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  quoteBody: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  quoteMark: {
    fontFamily: Fonts.extraBold,
    fontSize: 30,
    color: Colors.honey,
    lineHeight: 32,
    marginTop: -4,
  },
  quoteText: {
    ...Type.body,
    flex: 1,
    fontSize: 15,
    color: Colors.bark,
    fontStyle: "italic",
    lineHeight: 22,
    marginTop: 3,
  },
  quoteFooter: {
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 10,
    textAlign: "right",
    opacity: 0.75,
  },
  quoteFooterRTL: { textAlign: "left" },
  refreshButton: {
    marginTop: 16,
    alignSelf: "center",
  },
  strip: {
    flexDirection: "row",
  },
  thumb: {
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  thumbPressed: {
    opacity: 0.75,
  },
  badge: {
    position: "absolute",
    bottom: 6,
    end: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 10,
  },
});
