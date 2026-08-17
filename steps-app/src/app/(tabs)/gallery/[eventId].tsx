import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  ScrollView,
  Text,
  View,
} from "react-native";

import { EmptyState } from "../../../components/gallery/EmptyState";
import { EventCaption } from "../../../components/gallery/EventCaption";
import { FullscreenPhotoViewer } from "../../../components/gallery/FullscreenPhotoViewer";
import AdminHeader from "../../../components/admin/AdminHeader";
import { track } from "../../../services/analytics";
import ChildTag from "../../../components/gallery/ChildTag";
import { Screen } from "../../../components/Screen";
import { SkeletonPhotoGrid } from "../../../components/ui/Skeleton";
import { ScreenFadeIn } from "../../../components/ui/ScreenFadeIn";
import { Colors } from "../../../constants/Colors";
import { useReduceMotionSetting } from "../../../hooks/useReduceMotionSetting";
import { useTranslation } from "../../../i18n/useTranslation";
import { isPhotoTaggedWithAny, myEventGallery, Photo, resolvePhotoUrl } from "../../../services/galleryApi";
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

export default function EventGalleryScreen() {
  // One source for the tile size: the skeleton, the grid and every tile use
  // this number, so placeholders land exactly where photos will.
  const [gridWidth, setGridWidth] = useState(0);
  const photoTileSize = gridWidth
    ? Math.floor((gridWidth - GAP * (COLS - 1)) / COLS)
    : 0;
  const { t, isRTL } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const children = useChildren();
  const childIds = children.map((child) => child.id);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const reachedEnd = useRef(false);

  const { data, isError } = useQuery({
    queryKey: ["gallery", "event", eventId],
    queryFn: () => myEventGallery(eventId as string),
    enabled: !!eventId,
  });
  const photos = data?.photos ?? null;

  // Album id and date only — never a photo, never a child.
  useEffect(() => {
    if (!data) return;
    track("album_opened", { album_id: data.event.id, album_date: data.event.date });
  }, [data?.event.id]);

  return (
    <Screen>
      <ScreenFadeIn style={styles.fadeContainer}>
        <AdminHeader
          title={data?.event.name ?? t.gallery.pageTitle}
          subtitle={
            data
              ? t.gallery.parentEventMeta(formatIsoDate(data.event.date, t), photos?.length ?? 0)
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
          ) : photos.length === 0 ? (
            <EmptyState title={t.gallery.noPhotosInEvent} />
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

      <FullscreenPhotoViewer
        albumId={eventId as string}
        photos={activeIndex === null ? null : photos}
        initialIndex={activeIndex ?? 0}
        childIds={childIds}
        onClose={() => setActiveIndex(null)}
      />
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
});
