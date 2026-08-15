import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { EmptyState } from "../../../components/gallery/EmptyState";
import { EventCaption } from "../../../components/gallery/EventCaption";
import { FullscreenPhotoViewer } from "../../../components/gallery/FullscreenPhotoViewer";
import { Screen } from "../../../components/Screen";
import { SkeletonPhotoGrid } from "../../../components/ui/Skeleton";
import { ScreenFadeIn } from "../../../components/ui/ScreenFadeIn";
import { StepsHeader } from "../../../components/ui/StepsHeader";
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
  tagged,
  onPress,
}: {
  photo: Photo;
  index: number;
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
    <Animated.View style={[styles.tile, animatedStyle]}>
      <Touchable style={[styles.tileInner]} onPress={onPress}>
        <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={styles.image} />
        {tagged ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🐘</Text>
          </View>
        ) : null}
      </Touchable>
    </Animated.View>
  );
}

export default function EventGalleryScreen() {
  // Matches the real grid: three columns inside the screen's 24pt padding,
  // less each tile's 4pt margin on both sides.
  const { width } = useWindowDimensions();
  const photoTileSize = (width - 48) / 3 - 8;
  const { t } = useTranslation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const children = useChildren();
  const childIds = children.map((child) => child.id);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isError } = useQuery({
    queryKey: ["gallery", "event", eventId],
    queryFn: () => myEventGallery(eventId as string),
    enabled: !!eventId,
  });
  const photos = data?.photos ?? null;

  return (
    <Screen>
      <ScreenFadeIn style={styles.fadeContainer}>
        <StepsHeader
          title={data?.event.name ?? t.gallery.pageTitle}
          subtitle={data ? formatIsoDate(data.event.date, t) : undefined}
          showBack
        />

        <EventCaption caption={data?.event.caption} variant="detail" />

        {isError ? (
          <EmptyState
            emoji="⚠️"
            title={t.gallery.couldntLoadPhotos}
            subtitle={t.gallery.pleaseTryAgain}
          />
        ) : photos === null ? (
          <SkeletonPhotoGrid tileSize={photoTileSize} />
        ) : photos.length === 0 ? (
          <EmptyState title={t.gallery.noPhotosInEvent} />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(photo) => photo.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            style={styles.list}
            renderItem={({ item, index }) => (
              <PhotoTile
                photo={item}
                index={index}
                tagged={isPhotoTaggedWithAny(item, childIds)}
                onPress={() => setActiveIndex(index)}
              />
            )}
          />
        )}
      </ScreenFadeIn>

      <FullscreenPhotoViewer
        photos={activeIndex === null ? null : photos}
        initialIndex={activeIndex ?? 0}
        childIds={childIds}
        onClose={() => setActiveIndex(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fadeContainer: {
    flex: 1,
  },
  list: {
    marginTop: 16,
  },
  grid: {
    gap: 8,
  },
  tile: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
  },
  tileInner: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  tilePressed: {
    opacity: 0.75,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.card,
  },
  badge: {
    position: "absolute",
    top: 6,
    end: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
  },
});
