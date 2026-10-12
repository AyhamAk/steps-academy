import { useIsFocused } from "@react-navigation/native";
import { useEvent } from "expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import { track } from "../services/analytics";
import { Photo, resolvePhotoUrl } from "../services/galleryApi";
import { getPlayerVideos } from "../store/videoPlayerStore";

/**
 * An album's videos, full screen, one per page: swipe up or down for the
 * next. Only the page on screen plays; everything pauses when the screen
 * loses focus or the app goes to the background. Closing is the ✕ only —
 * the vertical swipe already means next/previous.
 */
export default function VideoPlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const [{ videos, albumId }] = useState(getPlayerVideos);
  const startIndex = Math.min(Math.max(Number(start) || 0, 0), Math.max(videos.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const isFocused = useIsFocused();
  const [isForeground, setIsForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setIsForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  const canPlay = isFocused && isForeground;

  // Album only, as with photos: never which video, never which child.
  useEffect(() => {
    track("video_player_opened", { album_id: albumId });
  }, [albumId]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.find((entry) => entry.isViewable);
    if (visible?.index != null) setActiveIndex(visible.index);
  }).current;

  return (
    <View style={styles.playerScreen}>
      <Stack.Screen options={{ animation: "fade", gestureEnabled: false }} />
      <FlatList<Photo>
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        // Only the neighbours stay mounted, so only a few players exist at once.
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ item, index }) => (
          <VideoPage item={item} isActive={index === activeIndex && canPlay} height={height} />
        )}
      />

      <Touchable
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        hitSlop={12}
        onPress={() => router.back()}
        accessibilityLabel={t.gallery.closeVideo}
      >
        <Text style={styles.closeText}>✕</Text>
      </Touchable>
      {videos.length > 1 ? (
        <Text style={[styles.counter, { top: insets.top + 20 }]}>
          {activeIndex + 1} / {videos.length}
        </Text>
      ) : null}
    </View>
  );
}

function VideoPage({ item, isActive, height }: { item: Photo; isActive: boolean; height: number }) {
  const { t } = useTranslation();
  const player = useVideoPlayer(resolvePhotoUrl(item.url), (p) => {
    p.loop = true;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  return (
    <View style={[styles.page, { height }]}>
      {status === "error" ? (
        <Text style={styles.errorText}>{t.gallery.videoError}</Text>
      ) : (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Black and white are deliberate here: a full-screen media player.
  playerScreen: { flex: 1, backgroundColor: Colors.black },
  page: { backgroundColor: Colors.black, justifyContent: "center", alignItems: "center" },
  errorText: {
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  closeBtn: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: { color: Colors.white, fontSize: 18 },
  counter: {
    position: "absolute",
    left: 16,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    writingDirection: "ltr",
  },
});
