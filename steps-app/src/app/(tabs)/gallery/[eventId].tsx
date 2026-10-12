import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  ScrollView,
  Text,
  View,
} from "react-native";

import { EmptyState } from "../../../components/gallery/EmptyState";
import { EventCaption } from "../../../components/gallery/EventCaption";
import { FullscreenPhotoViewer } from "../../../components/gallery/FullscreenPhotoViewer";
import { VideoCard } from "../../../components/gallery/VideoCard";
import AdminHeader from "../../../components/admin/AdminHeader";
import { track } from "../../../services/analytics";
import ChildTag from "../../../components/gallery/ChildTag";
import { Screen } from "../../../components/Screen";
import { SkeletonPhotoGrid } from "../../../components/ui/Skeleton";
import { ScreenFadeIn } from "../../../components/ui/ScreenFadeIn";
import { Colors } from "../../../constants/Colors";
import { Fonts } from "../../../constants/Fonts";
import { useReduceMotionSetting } from "../../../hooks/useReduceMotionSetting";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  isPhotoTaggedWithAny,
  isVideo,
  myEventGallery,
  Photo,
  resolvePhotoUrl,
} from "../../../services/galleryApi";
import { setPlayerVideos } from "../../../store/videoPlayerStore";
import { useChildren } from "../../../store/authStore";
import { formatIsoDate } from "../../../utils/date";
import { Touchable } from "../../../components/ui/Touchable";

function PhotoTile({
  photo,
  index,
  size,
  tagged,
  onPress,
}: {
  photo: Photo;
  index: number;
  size: number;
  tagged: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotionSetting();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      delay: index * 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  };

  return (
    <Animated.View style={[styles.tile, { width: size, height: size }, animatedStyle]}>
      <Touchable style={[styles.tileInner]} onPress={onPress}>
        <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={styles.image} />
        {tagged ? <ChildTag /> : null}
      </Touchable>
    </Animated.View>
  );
}

const GAP = 8;
const COLS = 3;

type Filter = "all" | "photo" | "video";

function RowGap() {
  return <View style={{ height: GAP }} />;
}

export default function EventGalleryScreen() {
  // One source for the tile size: the skeleton, the grid and every tile use
  // this number, so placeholders land exactly where photos will.
  const [gridWidth, setGridWidth] = useState(0);
  const photoTileSize = gridWidth
    ? Math.floor((gridWidth - GAP * (COLS - 1)) / COLS)
    : 0;
  const { t, isRTL, rtlText } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const children = useChildren();
  const childIds = children.map((child) => child.id);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const reachedEnd = useRef(false);

  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isError } = useQuery({
    queryKey: ["gallery", "event", eventId],
    queryFn: () => myEventGallery(eventId as string),
    enabled: !!eventId,
  });
  // The album holds both; the photo grid and viewer only ever get photos.
  const items = data?.photos ?? null;
  const photos = items ? items.filter((item) => !isVideo(item)) : null;
  const videos = items ? items.filter(isVideo) : [];
  const hasVideos = videos.length > 0;

  const videoCellWidth = gridWidth ? Math.floor((gridWidth - GAP) / 2) : 0;

  const openPlayer = (index: number) => {
    setPlayerVideos(eventId as string, videos);
    router.push({ pathname: "/video-player", params: { start: String(index) } });
  };

  const trackScrolledToEnd = () => {
    if (reachedEnd.current) return;
    reachedEnd.current = true;
    track("album_scrolled_to_end", { album_id: eventId as string });
  };

  // Album id and date only — never a photo, never a child.
  useEffect(() => {
    if (!data) return;
    track("album_opened", { album_id: data.event.id, album_date: data.event.date });
  }, [data?.event.id]);

  return (
    <Screen>
      <ScreenFadeIn style={styles.fadeContainer}>
        <AdminHeader
          backTo="/gallery"
          title={data?.event.name ?? t.gallery.pageTitle}
          subtitle={
            data
              ? hasVideos
                ? // The chips carry the counts once there is more than one kind.
                  formatIsoDate(data.event.date, t)
                : t.gallery.parentEventMeta(formatIsoDate(data.event.date, t), photos?.length ?? 0)
              : undefined
          }
        />

        <EventCaption caption={data?.event.caption} variant="detail" />

        {/* One measured number drives the tiles and the placeholders. Deriving
            it from assumed padding broke twice: once by double-counting
            Screen's padding, once by ignoring the side safe-area insets. */}
        <View style={styles.gridArea} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {isError ? (
            <EmptyState
              emoji="⚠️"
              title={t.gallery.couldntLoadPhotos}
              subtitle={t.gallery.pleaseTryAgain}
            />
          ) : photos === null ? (
            photoTileSize > 0 ? (
              <SkeletonPhotoGrid tileSize={photoTileSize} />
            ) : null
          ) : photos.length === 0 && !hasVideos ? (
            <EmptyState title={t.gallery.noPhotosInEvent} />
          ) : hasVideos ? (
            // One list for the whole album, so it scrolls as a piece and the
            // photos stay virtualised. Columns can't change on a live
            // FlatList, hence the key.
            <FlatList<Photo>
              key={filter === "video" ? "videos" : "photos"}
              style={styles.list}
              data={photoTileSize > 0 ? (filter === "video" ? videos : photos) : []}
              numColumns={filter === "video" ? 2 : COLS}
              keyExtractor={(item) => item.id}
              columnWrapperStyle={[styles.columnRow, isRTL && styles.gridRTL]}
              ItemSeparatorComponent={RowGap}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={trackScrolledToEnd}
              ListHeaderComponent={
                <View>
                  <View style={[styles.chipsRow, isRTL && styles.gridRTL]}>
                    {(
                      [
                        { key: "all", label: t.gallery.filterAll, count: items?.length ?? 0 },
                        { key: "photo", label: `📷 ${t.gallery.filterPhotos}`, count: photos.length },
                        { key: "video", label: `🎬 ${t.gallery.filterVideos}`, count: videos.length },
                      ] as const
                    ).map((chip) => {
                      const active = filter === chip.key;
                      return (
                        <Touchable
                          key={chip.key}
                          onPress={() => setFilter(chip.key)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          {/* Label and number apart, so neither reorders the other. */}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                          <Text style={[styles.chipCount, active && styles.chipTextActive]}>{chip.count}</Text>
                        </Touchable>
                      );
                    })}
                  </View>

                  {filter === "all" ? (
                    <>
                      <Text style={[styles.sectionLabel, rtlText]}>🎬 {t.gallery.videosSection}</Text>
                      <FlatList<Photo>
                        horizontal
                        // Starts from the reading side: right in Arabic and Hebrew.
                        inverted={isRTL}
                        data={videos}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.videoRowContent}
                        renderItem={({ item, index }) => (
                          <VideoCard item={item} size="row" onPress={() => openPlayer(index)} />
                        )}
                      />
                      {photos.length > 0 ? (
                        <Text style={[styles.sectionLabel, rtlText]}>📷 {t.gallery.photosSection}</Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              }
              renderItem={({ item, index }) =>
                filter === "video" ? (
                  <VideoCard item={item} size="grid" width={videoCellWidth} onPress={() => openPlayer(index)} />
                ) : (
                  <PhotoTile
                    photo={item}
                    index={index}
                    size={photoTileSize}
                    tagged={isPhotoTaggedWithAny(item, childIds)}
                    onPress={() => setActiveIndex(index)}
                  />
                )
              }
            />
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={250}
              onScroll={(e) => {
                if (reachedEnd.current) return;
                const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
                const atEnd =
                  contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
                if (!atEnd) return;
                reachedEnd.current = true;
                track("album_scrolled_to_end", { album_id: eventId as string });
              }}
            >
              <View style={[styles.grid, isRTL && styles.gridRTL]}>
                {photoTileSize > 0
                  ? photos.map((photo, index) => (
                      <PhotoTile
                        key={photo.id}
                        photo={photo}
                        index={index}
                        size={photoTileSize}
                        tagged={isPhotoTaggedWithAny(photo, childIds)}
                        onPress={() => setActiveIndex(index)}
                      />
                    ))
                  : null}
              </View>
            </ScrollView>
          )}
        </View>
      </ScreenFadeIn>

      {/* Mounted per open, so every tap starts the viewer on that photo —
          kept mounted, it remembered the first photo it was opened on. */}
      {activeIndex !== null ? (
        <FullscreenPhotoViewer
          key={activeIndex}
          albumId={eventId as string}
          photos={photos}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    justifyContent: "flex-start",
    paddingBottom: 24,
  },
  gridRTL: { flexDirection: "row-reverse" },
  tile: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.linen,
  },
  tileInner: { flex: 1 },
  image: { width: "100%", height: "100%" },
  fadeContainer: {
    flex: 1,
  },
  gridArea: { flex: 1 },
  list: {
    marginTop: 16,
  },
  tilePressed: {
    opacity: 0.75,
  },

  // Albums with videos.
  listContent: { paddingBottom: 24 },
  columnRow: { flexDirection: "row", gap: GAP },
  chipsRow: { flexDirection: "row", gap: 7, marginBottom: 18 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 15,
    minHeight: 36,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.textLight },
  chipCount: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.textLight },
  chipTextActive: { color: Colors.background, fontFamily: Fonts.bold },
  sectionLabel: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.text, marginBottom: 9 },
  videoRowContent: { gap: 8, paddingBottom: 20 },
});
