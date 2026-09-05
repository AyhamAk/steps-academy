import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import {
  GalleryGroup,
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
import { EmptyState } from "./EmptyState";
import { FullscreenPhotoViewer } from "./FullscreenPhotoViewer";
import { Touchable } from "../ui/Touchable";

type ViewerState = { photos: Photo[]; index: number; albumId: string };

/** Tiles shown on an album card before the count tile takes over. */
const PREVIEW_SLOTS = 4;

/**
 * One square in an album's preview strip.
 *
 * Flexes rather than taking a fixed size, so four tiles divide the card evenly
 * at any width. Keeps the tagged badge: which photos actually contain your own
 * child is the most useful thing on this screen, and a plain Image loses it.
 */
function PreviewTile({
  photo,
  tagged,
  onPress,
}: {
  photo: Photo;
  tagged: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable onPress={onPress} style={styles.previewTile}>
      <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={styles.previewImage} />
      {tagged ? <ChildTag /> : null}
    </Touchable>
  );
}

/** "2026-09" — the key albums are grouped under. */
function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function ParentGalleryScreen() {
  const { t, isRTL, rtlText, locale } = useTranslation();
  const children = useChildren();
  const childIds = children.map((child) => child.id);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const { data: groups, isError, refetch } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: myGallery,
  });
  const { data: quote } = useQuery({ queryKey: ["gallery", "quote"], queryFn: getGalleryQuote });

  /**
   * Albums bucketed by the month they happened in, newest month first and
   * newest album first inside each. A year of albums as one flat list gives a
   * parent nothing to navigate by.
   */
  const months = useMemo(() => {
    const buckets = new Map<string, GalleryGroup[]>();
    for (const group of groups ?? []) {
      const key = monthKeyOf(group.event.date);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(group);
      else buckets.set(key, [group]);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, albums]) => ({
        key,
        // The month name only; the year is already implied by the date on
        // every card, and repeating it makes the label a mouthful.
        label: t.common.months[Number(key.slice(5, 7)) - 1],
        albums: [...albums].sort((a, b) => b.event.date.localeCompare(a.event.date)),
      }));
  }, [groups, locale]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenFadeIn>
          <AdminHeader
            title={t.gallery.pageTitle}
            subtitle={t.gallery.parentSubtitle}
            showBack={false}
          />

          {/* A message the academy pins above every album. One quiet line —
              it used to be a card with its own header and avatar, which gave
              a single sentence more weight than the albums beneath it. */}
          {quote ? (
            <View style={styles.quoteBanner}>
              <Text style={[styles.quoteText, rtlText]} maxFontSizeMultiplier={1.4}>
                {quote}
              </Text>
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
          ) : groups.length === 0 ? (
            <EmptyState
              title={t.gallery.noPhotosYetParent}
              subtitle={t.gallery.noPhotosYetParentSubtitle}
            />
          ) : (
            months.map((month) => (
              <View key={month.key}>
                <Text style={[styles.monthLabel, rtlText]} maxFontSizeMultiplier={1.3}>
                  {month.label}
                </Text>

                {month.albums.map((group) => {
                  const total = group.photos.length;
                  // Four tiles, always. Beyond four the last one becomes a
                  // count, so the strip never reflows between albums.
                  const overflow = total > PREVIEW_SLOTS ? total - (PREVIEW_SLOTS - 1) : 0;
                  const shown = group.photos.slice(
                    0,
                    overflow > 0 ? PREVIEW_SLOTS - 1 : PREVIEW_SLOTS
                  );
                  const emptySlots = Math.max(
                    0,
                    PREVIEW_SLOTS - shown.length - (overflow > 0 ? 1 : 0)
                  );

                  return (
                    // Touchable, not Pressable: on this build a Pressable
                    // with a function `style` renders its children but drops
                    // the resolved background and padding — see the note in
                    // components/ui/Touchable. That is why the card had no
                    // container while its contents appeared. TouchableOpacity
                    // dims on press, which is the affordance the card needs.
                    <Touchable
                      key={group.event.id}
                      accessibilityLabel={group.event.name}
                      onPress={() => router.push(`/gallery/${group.event.id}`)}
                      style={styles.albumCard}
                    >
                      <View style={[styles.albumTitleRow, isRTL && styles.rowReverse]}>
                        <Text
                          style={[styles.albumTitle, rtlText]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                        >
                          {group.event.name}
                        </Text>
                        <Text style={styles.chevron}>{isRTL ? "‹" : "›"}</Text>
                      </View>

                      <Text style={[styles.albumDate, rtlText]} maxFontSizeMultiplier={1.4}>
                        {formatIsoDate(group.event.date, t)}
                      </Text>

                      {group.event.caption ? (
                        <View style={[styles.captionChip, isRTL && styles.rowReverse]}>
                          <Text style={styles.captionEmoji}>💬</Text>
                          <Text
                            style={[styles.captionText, rtlText]}
                            numberOfLines={2}
                            maxFontSizeMultiplier={1.3}
                          >
                            {group.event.caption}
                          </Text>
                        </View>
                      ) : null}

                      {total === 0 ? (
                        <Text style={styles.stripEmpty} maxFontSizeMultiplier={1.4}>
                          {t.gallery.noPhotosYetCard}
                        </Text>
                      ) : (
                        <View style={[styles.previewStrip, isRTL && styles.rowReverse]}>
                          {shown.map((photo, index) => (
                            <PreviewTile
                              key={photo.id}
                              photo={photo}
                              tagged={isPhotoTaggedWithAny(photo, childIds)}
                              onPress={() =>
                                setViewer({
                                  photos: group.photos,
                                  index,
                                  albumId: group.event.id,
                                })
                              }
                            />
                          ))}
                          {overflow > 0 ? (
                            <View style={[styles.previewTile, styles.countTile]}>
                              <Text style={styles.countTileText} maxFontSizeMultiplier={1.3}>
                                +{overflow}
                              </Text>
                            </View>
                          ) : null}
                          {Array.from({ length: emptySlots }, (_, i) => (
                            <View key={`empty-${i}`} style={[styles.previewTile, styles.emptyTile]} />
                          ))}
                        </View>
                      )}
                    </Touchable>
                  );
                })}
              </View>
            ))
          )}
        </ScreenFadeIn>
      </ScrollView>

      {viewer ? (
        <FullscreenPhotoViewer
          photos={viewer.photos}
          initialIndex={viewer.index}
          albumId={viewer.albumId}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  rowReverse: { flexDirection: "row-reverse" },
  refreshButton: { marginTop: 16 },

  quoteBanner: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  quoteText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight },

  monthLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },

  albumCard: {
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  albumTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  albumTitle: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.bark,
    // Admin-entered: an Arabic album name inside an English UI resolves its
    // own direction rather than inheriting the screen's.
    writingDirection: "auto",
  },
  chevron: { fontSize: 18, color: Colors.textLight },
  albumDate: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    marginBottom: 10,
  },

  captionChip: {
    flexDirection: "row",
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  captionEmoji: { fontSize: 13 },
  captionText: { flex: 1, fontFamily: Fonts.regular, fontSize: 12, color: Colors.bark },

  previewStrip: { flexDirection: "row", gap: 6 },
  previewTile: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: Colors.linen },
  previewImage: { width: "100%", height: "100%", borderRadius: 10, backgroundColor: Colors.linen },
  countTile: { backgroundColor: Colors.clayLight, alignItems: "center", justifyContent: "center" },
  countTileText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.clay },
  emptyTile: {
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  stripEmpty: { ...Type.caption, color: Colors.textLight },
});
