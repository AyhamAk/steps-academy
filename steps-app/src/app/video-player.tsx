import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useEvent } from "expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDuration } from "../components/gallery/VideoCard";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useTranslation } from "../i18n/useTranslation";
import { track } from "../services/analytics";
import { Photo, resolvePhotoUrl } from "../services/galleryApi";
import { getPlayerVideos } from "../store/videoPlayerStore";

/**
 * An album's videos, full screen, one per page: swipe sideways for the next,
 * like the photo viewer. Only the page on screen plays; everything pauses when
 * the screen loses focus or the app goes to the background.
 */
export default function VideoPlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        // Only the neighbours stay mounted, so only a few players exist at once.
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ item, index }) => (
          <VideoPage item={item} isActive={index === activeIndex && canPlay} width={width} height={height} />
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

function VideoPage({
  item,
  isActive,
  width,
  height,
}: {
  item: Photo;
  isActive: boolean;
  width: number;
  height: number;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(resolvePhotoUrl(item.url), (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const duration = player.duration > 0 ? player.duration : item.durationSec ?? 0;

  // Our own controls rather than the system's: inside a swipeable list the
  // native ones hid themselves and at times never came back on a tap.
  const [controlsVisible, setControlsVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
    setControlsVisible(true);
  }, [isActive, player]);

  // Out of the way once it's playing; they stay while paused.
  useEffect(() => {
    if (!controlsVisible || !isPlaying) return;
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [controlsVisible, isPlaying, currentTime > 0]);

  const seekBy = (seconds: number) => {
    player.currentTime = Math.min(Math.max(player.currentTime + seconds, 0), Math.max(duration - 0.1, 0));
    setControlsVisible(true);
  };
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  if (status === "error") {
    return (
      <View style={[styles.page, { width, height }]}>
        <Text style={styles.errorText}>{t.gallery.videoError}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.page, { width, height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />

      {/* A tap anywhere shows or hides the controls; swipes still page. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setControlsVisible((shown) => !shown)}>
        {controlsVisible ? (
          <View style={styles.controlsLayer}>
            {/* Media buttons keep their usual left-to-right order in every language. */}
            <View style={styles.centerRow}>
              <Touchable style={styles.skipBtn} onPress={() => seekBy(-10)} accessibilityLabel="-10s">
                <Ionicons name="play-back" size={24} color={Colors.white} />
                <Text style={styles.skipText}>10</Text>
              </Touchable>
              <Touchable
                style={styles.playBtn}
                onPress={() => {
                  if (isPlaying) player.pause();
                  else player.play();
                  setControlsVisible(true);
                }}
                accessibilityLabel={isPlaying ? "pause" : "play"}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={34} color={Colors.white} style={!isPlaying && styles.playNudge} />
              </Touchable>
              <Touchable style={styles.skipBtn} onPress={() => seekBy(10)} accessibilityLabel="+10s">
                <Ionicons name="play-forward" size={24} color={Colors.white} />
                <Text style={styles.skipText}>10</Text>
              </Touchable>
            </View>

            <View style={[styles.bottomBar, { bottom: insets.bottom + 24 }]}>
              {/* Tap the bar to jump to that point. */}
              <Pressable
                style={styles.trackHit}
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                onPress={(e) => {
                  if (!trackWidth || !duration) return;
                  player.currentTime = (e.nativeEvent.locationX / trackWidth) * duration;
                  setControlsVisible(true);
                }}
              >
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
                </View>
              </Pressable>
              <Text style={styles.timeText}>
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
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

  controlsLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
  centerRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  playNudge: { marginLeft: 4 },
  skipBtn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  skipText: { color: Colors.white, fontFamily: Fonts.semiBold, fontSize: 11, marginTop: 1 },
  bottomBar: { position: "absolute", left: 20, right: 20 },
  trackHit: { height: 28, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  trackFill: { height: "100%", backgroundColor: Colors.white },
  timeText: {
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    marginTop: 2,
    writingDirection: "ltr",
    textAlign: "left",
  },
  counter: {
    position: "absolute",
    left: 16,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    writingDirection: "ltr",
  },
});
