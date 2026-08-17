import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { matchedTagNames, Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";

type FullscreenPhotoViewerProps = {
  photos: Photo[] | null;
  initialIndex?: number;
  childIds?: string[];
  /** Album only. Deliberately no photo id and no child id: usage data must
   *  never become a record of who looked at which picture of which child. */
  albumId?: string;
  onClose: () => void;
};

export function FullscreenPhotoViewer({
  photos,
  initialIndex = 0,
  childIds = [],
  albumId,
  onClose,
}: FullscreenPhotoViewerProps) {
  const { t, isRTL } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const lastTap = useRef(0);
  const openedAt = useRef(0);
  const swipes = useRef(0);

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
  const matched = matchedTagNames(current, childIds);

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), photos.length - 1);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    swipes.current += 1;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setFit((prev) => (prev === "contain" ? "cover" : "contain"));
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const downloadToCache = () =>
    File.downloadFileAsync(resolvePhotoUrl(current.url), Paths.cache, { idempotent: true });

  const handleDownload = async () => {
    setBusy("download");
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
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
          onMomentumScrollEnd={handleMomentumEnd}
          onLayout={() => {
            if (didInitialScroll.current) return;
            didInitialScroll.current = true;
            if (initialIndex > 0) {
              scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
            }
          }}
        >
          {photos.map((photo) => (
            <Touchable key={photo.id} onPress={handleTap} style={{ width }}>
              <Image
                source={{ uri: resolvePhotoUrl(photo.url) }}
                style={styles.image}
                resizeMode={fit}
              />
            </Touchable>
          ))}
        </ScrollView>

        <View
          style={[styles.topBar, { top: insets.top + 8 }, isRTL && styles.rowReverse]}
          pointerEvents="box-none"
        >
          <Touchable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={Colors.cream} />
          </Touchable>
          {photos.length > 1 ? (
            <View style={styles.counterPill}>
              <Text style={styles.counter}>
                {safeIndex + 1} / {photos.length}
              </Text>
            </View>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <>
            {safeIndex > 0 ? (
              <Touchable
                style={[styles.arrow, styles.arrowStart]}
                onPress={() => goTo(safeIndex - 1)}
                hitSlop={8}
              >
                <Ionicons
                  name={isRTL ? "chevron-forward" : "chevron-back"}
                  size={24}
                  color={Colors.cream}
                />
              </Touchable>
            ) : null}
            {safeIndex < photos.length - 1 ? (
              <Touchable
                style={[styles.arrow, styles.arrowEnd]}
                onPress={() => goTo(safeIndex + 1)}
                hitSlop={8}
              >
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={24}
                  color={Colors.cream}
                />
              </Touchable>
            ) : null}
          </>
        ) : null}

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {matched.length > 0 ? (
            <View style={[styles.captionPill, isRTL && styles.rowReverse]}>
              <Text style={styles.captionAvatar}>🐘</Text>
              {/* Two nodes, never one concatenated string: an Arabic sentence
                  with a Latin name puts its punctuation at the wrong end when
                  the bidi algorithm resolves the line as a whole. */}
              <Text style={styles.captionText}>{t.gallery.inThisPhoto}</Text>
              <Text style={styles.captionName}>{matched[0]}</Text>
            </View>
          ) : null}

          <View style={[styles.actions, isRTL && styles.rowReverse]}>
            <Touchable style={styles.actionButton} onPress={handleDownload} disabled={!!busy}>
              {busy === "download" ? (
                <ActivityIndicator color={Colors.cream} />
              ) : (
                <View style={[styles.actionInner, isRTL && styles.rowReverse]}>
                  <Ionicons name="download-outline" size={18} color={Colors.cream} />
                  <Text style={styles.actionText}>{t.gallery.save}</Text>
                </View>
              )}
            </Touchable>
            <Touchable style={styles.actionButton} onPress={handleShare} disabled={!!busy}>
              {busy === "share" ? (
                <ActivityIndicator color={Colors.cream} />
              ) : (
                <View style={[styles.actionInner, isRTL && styles.rowReverse]}>
                  <Ionicons name="share-outline" size={18} color={Colors.cream} />
                  <Text style={styles.actionText}>{t.gallery.share}</Text>
                </View>
              )}
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  rowReverse: { flexDirection: "row-reverse" },
  image: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    start: 0,
    end: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  // Scrimmed, so both survive a bright photo behind them.
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterPill: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: Colors.cream,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  arrowStart: { start: 12 },
  arrowEnd: { end: 12 },
  bottom: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 16,
  },
  captionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  captionAvatar: { fontSize: 16 },
  captionText: {
    color: Colors.cream,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    writingDirection: "auto",
  },
  captionName: {
    color: Colors.honey,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    writingDirection: "auto",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: {
    color: Colors.cream,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
});
