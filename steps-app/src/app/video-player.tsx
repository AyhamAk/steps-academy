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
  Animated,
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

/** Height of the Save/Share row, so each page can sit its progress bar above it. */
const ACTIONS_HEIGHT = 62;

/**
 * An album's videos, full screen, one per page: swipe sideways for the next,
 * like the photo viewer — and dressed like it: a plain ✕ and counter on top,
 * Save and Share underneath, all hidden or shown by a single tap. Only the
 * page on screen plays; everything pauses when the screen loses focus or the
 * app goes to the background.
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

  // One switch for everything on top of the video: bars and playback controls.
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const [chromeVisible, setChromeVisible] = useState(true);
  const showChrome = (next: boolean) => {
    setChromeVisible(next);
    Animated.timing(chromeOpacity, { toValue: next ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  };
  // A new video starts with its controls showing.
  useEffect(() => {
    showChrome(true);
  }, [activeIndex]);

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
            barBottom={insets.bottom + 14 + ACTIONS_HEIGHT}
            chromeVisible={chromeVisible && index === activeIndex}
            chromeOpacity={chromeOpacity}
            onToggleChrome={() => showChrome(!chromeVisible)}
            onHideChrome={() => showChrome(false)}
          />
        )}
      />

      {/* ✕ on the same physical side in every language, as system photo apps do. */}
      <Animated.View
        pointerEvents={chromeVisible ? "box-none" : "none"}
        style={[styles.topBar, { paddingTop: insets.top + 6, opacity: chromeOpacity }]}
      >
        <Touchable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10} accessibilityLabel={t.gallery.closeVideo}>
          <Ionicons name="close" size={26} color={Colors.white} />
        </Touchable>
        {videos.length > 1 ? (
          <Text style={styles.counter}>
            {activeIndex + 1} / {videos.length}
          </Text>
        ) : null}
        <View style={styles.iconBtn} />
      </Animated.View>

      {/* Save then Share in reading order: Save on the right in Arabic and Hebrew. */}
      {current ? (
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[
            styles.actionsBar,
            isRTL && styles.rowReverse,
            { paddingBottom: insets.bottom + 14, opacity: chromeOpacity },
          ]}
        >
          <Touchable style={styles.action} onPress={handleDownload} disabled={!!busy} accessibilityLabel={t.gallery.save}>
            {busy === "download" ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Ionicons name="download-outline" size={26} color={Colors.white} />
            )}
            <Text style={styles.actionLabel}>{t.gallery.save}</Text>
          </Touchable>
          <Touchable style={styles.action} onPress={handleShare} disabled={!!busy} accessibilityLabel={t.gallery.share}>
            {busy === "share" ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Ionicons name="share-outline" size={26} color={Colors.white} />
            )}
            <Text style={styles.actionLabel}>{t.gallery.share}</Text>
          </Touchable>
        </Animated.View>
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
  chromeVisible,
  chromeOpacity,
  onToggleChrome,
  onHideChrome,
}: {
  item: Photo;
  isActive: boolean;
  width: number;
  height: number;
  /** Distance of the progress bar from the bottom edge, above Save and Share. */
  barBottom: number;
  chromeVisible: boolean;
  chromeOpacity: Animated.Value;
  onToggleChrome: () => void;
  onHideChrome: () => void;
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
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  // Our own controls rather than the system's: inside a swipeable list the
  // native ones hid themselves and at times never came back on a tap. They
  // get out of the way once the video plays, and stay while it's paused.
  const [lastTouch, setLastTouch] = useState(0);
  useEffect(() => {
    if (!chromeVisible || !isPlaying) return;
    const timer = setTimeout(onHideChrome, 3000);
    return () => clearTimeout(timer);
  }, [chromeVisible, isPlaying, lastTouch]);
  const touched = () => setLastTouch(Date.now());

  const seekBy = (seconds: number) => {
    player.currentTime = Math.min(Math.max(player.currentTime + seconds, 0), Math.max(duration - 0.1, 0));
    touched();
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

      {/* A tap anywhere shows or hides everything; swipes still page. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onToggleChrome}>
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[StyleSheet.absoluteFill, { opacity: chromeOpacity }]}
        >
          {/* Media buttons keep their usual left-to-right order in every language. */}
          <View style={styles.centerRow} pointerEvents="box-none">
            <Touchable style={styles.skipBtn} onPress={() => seekBy(-10)} accessibilityLabel="-10s">
              <Ionicons name="play-back" size={24} color={Colors.white} />
              <Text style={styles.skipText}>10</Text>
            </Touchable>
            <Touchable
              style={styles.playBtn}
              onPress={() => {
                if (isPlaying) player.pause();
                else player.play();
                touched();
              }}
              accessibilityLabel={isPlaying ? "pause" : "play"}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={34}
                color={Colors.white}
                style={!isPlaying && styles.playNudge}
              />
            </Touchable>
            <Touchable style={styles.skipBtn} onPress={() => seekBy(10)} accessibilityLabel="+10s">
              <Ionicons name="play-forward" size={24} color={Colors.white} />
              <Text style={styles.skipText}>10</Text>
            </Touchable>
          </View>

          <View style={[styles.progressBar, { bottom: barBottom }]}>
            {/* Tap the bar to jump to that point. */}
            <Pressable
              style={styles.trackHit}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onPress={(e) => {
                if (!trackWidth || !duration) return;
                player.currentTime = (e.nativeEvent.locationX / trackWidth) * duration;
                touched();
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
        </Animated.View>
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
  rowReverse: { flexDirection: "row-reverse" },

  // Same bars as the photo viewer.
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  counter: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.white,
    writingDirection: "ltr",
  },
  actionsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 56,
    paddingTop: 12,
  },
  action: { minWidth: 56, minHeight: 44, alignItems: "center", justifyContent: "center" },
  actionLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.white,
    opacity: 0.75,
    marginTop: 4,
  },

  // Playback controls.
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
  progressBar: { position: "absolute", left: 20, right: 20 },
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
});
