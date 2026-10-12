import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { track } from "../../services/analytics";
import { useTranslation } from "../../i18n/useTranslation";
import { Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";
import { ZoomableImage } from "./ZoomableImage";

type FullscreenPhotoViewerProps = {
  photos: Photo[] | null;
  initialIndex?: number;
  /** Album only. Deliberately no photo id and no child id: usage data must
   *  never become a record of who looked at which picture of which child. */
  albumId?: string;
  onClose: () => void;
};

export function FullscreenPhotoViewer({
  photos,
  initialIndex = 0,
  albumId,
  onClose,
}: FullscreenPhotoViewerProps) {
  const { t, isRTL } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  // A zoomed photo owns its own drags; the pager would otherwise swipe away.
  const [isZoomed, setIsZoomed] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const openedAt = useRef(0);
  const swipes = useRef(0);

  // A single tap on the photo hides or shows the bars, like the phone's own
  // photos app. (A double tap still zooms — ZoomableImage tells them apart.)
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const [chromeVisible, setChromeVisible] = useState(true);
  const toggleChrome = () => {
    const next = !chromeVisible;
    setChromeVisible(next);
    Animated.timing(chromeOpacity, { toValue: next ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  };

  const isOpen = !!photos && photos.length > 0;
  useEffect(() => {
    if (!isOpen) return;
    openedAt.current = Date.now();
    swipes.current = 0;
    track("photo_viewer_opened", { album_id: albumId });
    return () => {
      track("photo_viewer_closed", {
        album_id: albumId,
        seconds: Math.round((Date.now() - openedAt.current) / 1000),
        photos_swiped: swipes.current,
      });
    };
  }, [isOpen, albumId]);

  if (!photos || photos.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), photos.length - 1);
  const current = photos[safeIndex];
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    swipes.current += 1;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const downloadToCache = () =>
    File.downloadFileAsync(resolvePhotoUrl(current.url), Paths.cache, { idempotent: true });

  const handleDownload = async () => {
    setBusy("download");
    try {
      // writeOnly: saving needs no read access, and on Android 13+ it resolves without
      // requesting any permission at all — so the app never declares READ_MEDIA_IMAGES.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(t.common.permissionNeeded, t.gallery.allowPhotoLibrarySave, [
          { text: t.common.ok },
        ]);
        return;
      }
      const file = await downloadToCache();
      await MediaLibrary.saveToLibraryAsync(file.uri);
      track("photo_downloaded", { album_id: albumId });
      Alert.alert(t.gallery.saved, t.gallery.photoSavedToCameraRoll, [{ text: t.common.ok }]);
    } catch {
      Alert.alert(t.gallery.couldntSavePhoto, t.common.tryAgain, [{ text: t.common.ok }]);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t.gallery.sharingUnavailable, t.gallery.sharingNotSupported, [
          { text: t.common.ok },
        ]);
        return;
      }
      const file = await downloadToCache();
      await Sharing.shareAsync(file.uri);
    } catch {
      Alert.alert(t.gallery.couldntSharePhoto, t.common.tryAgain, [{ text: t.common.ok }]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isZoomed}
          onMomentumScrollEnd={handleMomentumEnd}
          // Starts on the tapped photo instead of scrolling there after the
          // first frame, which could land on photo 1. onLayout stays as the
          // fallback where contentOffset isn't honoured.
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onLayout={() => {
            if (didInitialScroll.current) return;
            didInitialScroll.current = true;
            if (initialIndex > 0) {
              scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
            }
          }}
        >
          {photos.map((photo) => (
            <ZoomableImage
              key={photo.id}
              uri={resolvePhotoUrl(photo.url)}
              width={width}
              onZoomChange={setIsZoomed}
              onSingleTap={toggleChrome}
            />
          ))}
        </ScrollView>

        {/* ✕ on the same physical side in every language, as system photo apps do. */}
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[styles.topBar, { paddingTop: insets.top + 6, opacity: chromeOpacity }]}
        >
          <Touchable style={styles.iconBtn} onPress={onClose} hitSlop={10} accessibilityLabel={t.gallery.closeVideo}>
            <Ionicons name="close" size={26} color={Colors.white} />
          </Touchable>
          {photos.length > 1 ? (
            <Text style={styles.counter}>
              {safeIndex + 1} / {photos.length}
            </Text>
          ) : null}
          {/* Balances the ✕ so the counter sits in the middle. */}
          <View style={styles.iconBtn} />
        </Animated.View>

        {/* Save then Share in reading order: Save on the right in Arabic and Hebrew. */}
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[
            styles.bottomBar,
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  rowReverse: { flexDirection: "row-reverse" },
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
  bottomBar: {
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
});
