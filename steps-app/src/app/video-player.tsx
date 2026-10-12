import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useEvent } from "expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const ACTION_HEIGHT = 48;

/**
 * An album's videos, full screen, one per page: swipe sideways for the next,
 * like the photo viewer. Only the page on screen plays; everything pauses when
 * the screen loses focus or the app goes to the background.
 */
export default function VideoPlayerScreen() {
  const { t, isRTL } = useTranslation();
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

  // Save and Share, as in the photo viewer. The file is fetched once into
  // the cache; its name keeps the .mp4/.mov ending the photo library needs.
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const current = videos[activeIndex];
  const downloadToCache = () =>
    File.downloadFileAsync(resolvePhotoUrl(current.url), Paths.cache, { idempotent: true });

  const handleDownload = async () => {
    setBusy("download");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(t.common.permissionNeeded, t.gallery.allowPhotoLibrarySave, [{ text: t.common.ok }]);
        return;
      }
      const file = await downloadToCache();
      await MediaLibrary.saveToLibraryAsync(file.uri);
      track("video_downloaded", { album_id: albumId });
      Alert.alert(t.gallery.saved, t.gallery.videoSavedToCameraRoll, [{ text: t.common.ok }]);
    } catch {
      Alert.alert(t.gallery.couldntSaveVideo, t.common.tryAgain, [{ text: t.common.ok }]);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t.gallery.sharingUnavailable, t.gallery.sharingNotSupported, [{ text: t.common.ok }]);
        return;
      }
      const file = await downloadToCache();
      await Sharing.shareAsync(file.uri);
    } catch {
      Alert.alert(t.gallery.couldntShareVideo, t.common.tryAgain, [{ text: t.common.ok }]);
    } finally {
      setBusy(null);
    }
  };

  // Where each page draws its progress bar: just above the buttons.
  const barBottom = insets.bottom + 16 + ACTION_HEIGHT + 14;

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
          <VideoPage
            item={item}
            isActive={index === activeIndex && canPlay}
            width={width}
            height={height}
            barBottom={barBottom}
          />
        )}
      />

      {current ? (
        <View style={[styles.actions, isRTL && styles.rowReverse, { bottom: insets.bottom + 16 }]}>
          <Touchable style={[styles.actionButton, styles.saveButton]} onPress={handleDownload} disabled={!!busy}>
            {busy === "download" ? (
              <ActivityIndicator color={Colors.cream} />
            ) : (
              <View style={[styles.actionInner, isRTL && styles.rowReverse]}>
                <Ionicons name="download-outline" size={18} color={Colors.cream} />
                <Text style={[styles.actionText, styles.saveText]}>{t.gallery.save}</Text>
              </View>
            )}
          </Touchable>
          <Touchable style={[styles.actionButton, styles.shareButton]} onPress={handleShare} disabled={!!busy}>
            {busy === "share" ? (
              <ActivityIndicator color={Colors.sageLight} />
            ) : (
              <View style={[styles.actionInner, isRTL && styles.rowReverse]}>
                <Ionicons name="share-outline" size={18} color={Colors.sageLight} />
                <Text style={[styles.actionText, styles.shareText]}>{t.gallery.share}</Text>
              </View>
            )}
          </Touchable>
        </View>
      ) : null}

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
  barBottom,
}: {
  item: Photo;
  isActive: boolean;
  width: number;
  height: number;
  /** Distance of the progress bar from the bottom edge, above Save and Share. */
  barBottom: number;
}) {
  const { t } = useTranslation();
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

            <View style={[styles.bottomBar, { bottom: barBottom }]}>
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

  // Save and Share — the photo viewer's buttons, same look.
  rowReverse: { flexDirection: "row-reverse" },
  actions: { position: "absolute", left: 16, right: 16, flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    height: ACTION_HEIGHT,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: Colors.sage,
    shadowColor: Colors.sageDeep,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shareButton: {
    backgroundColor: "rgba(44,36,22,0.55)",
    borderWidth: 1.5,
    borderColor: Colors.sage,
  },
  actionInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: { fontFamily: Fonts.semiBold, fontSize: 15 },
  saveText: { color: Colors.cream },
  shareText: { color: Colors.sageLight },

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
