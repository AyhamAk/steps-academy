import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { isPhotoTaggedWithAny, myGallery, Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { useAuthStore } from "../../store/authStore";
import { formatIsoDate } from "../../utils/date";
import { ScreenFadeIn } from "../ui/ScreenFadeIn";
import { SkeletonEventList } from "../ui/Skeleton";
import { StepsButton } from "../ui/StepsButton";
import { StepsCard } from "../ui/StepsCard";
import { StepsHeader } from "../ui/StepsHeader";
import { EmptyState } from "./EmptyState";
import { FullscreenPhotoViewer } from "./FullscreenPhotoViewer";

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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ marginEnd: 8 }, pressed && styles.thumbPressed]}
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
    </Pressable>
  );
}

export function ParentGalleryScreen() {
  const { t, isRTL, rtlText } = useTranslation();
  const childNames = useAuthStore((state) => state.user?.childNames ?? []);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const { data: groups, isError, refetch } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
  });

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenFadeIn>
          <StepsHeader title={t.gallery.pageTitle} subtitle={t.gallery.parentSubtitle} />

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
            <SkeletonEventList />
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
                      {group.photos.slice(0, 10).map((photo, photoIndex) => (
                        <TaggedThumb
                          key={photo.id}
                          photo={photo}
                          size={72}
                          tagged={isPhotoTaggedWithAny(photo, childNames)}
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
        childNames={childNames}
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
