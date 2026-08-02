import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { matchedTagNames, Photo, resolvePhotoUrl } from "../../services/galleryApi";

type FullscreenPhotoViewerProps = {
  photos: Photo[] | null;
  initialIndex?: number;
  childNames?: string[];
  onClose: () => void;
};

export function FullscreenPhotoViewer({
  photos,
  initialIndex = 0,
  childNames = [],
  onClose,
}: FullscreenPhotoViewerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const lastTap = useRef(0);

  if (!photos || photos.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), photos.length - 1);
  const current = photos[safeIndex];
  const matched = matchedTagNames(current, childNames);

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), photos.length - 1);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
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
            <Pressable key={photo.id} onPress={handleTap} style={{ width }}>
              <Image
                source={{ uri: resolvePhotoUrl(photo.url) }}
                style={styles.image}
                resizeMode={fit}
              />
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.topBar}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          {photos.length > 1 ? (
            <Text style={styles.counter}>
              {safeIndex + 1} / {photos.length}
            </Text>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <>
            {safeIndex > 0 ? (
              <Pressable
                style={[styles.arrow, styles.arrowLeft]}
                onPress={() => goTo(safeIndex - 1)}
                hitSlop={8}
              >
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>
            ) : null}
            {safeIndex < photos.length - 1 ? (
              <Pressable
                style={[styles.arrow, styles.arrowRight]}
                onPress={() => goTo(safeIndex + 1)}
                hitSlop={8}
              >
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <View style={styles.bottom}>
          {matched.length > 0 ? (
            <View style={styles.tagBanner}>
              <Text style={styles.tagBannerText}>{t.gallery.photoTaggedBanner(matched[0])}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={handleDownload} disabled={!!busy}>
              {busy === "download" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionText}>{t.gallery.save}</Text>
              )}
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleShare} disabled={!!busy}>
              {busy === "share" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionText}>{t.gallery.share}</Text>
              )}
            </Pressable>
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
  image: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  counter: {
    color: "#FFFFFF",
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  arrowLeft: {
    start: 16,
  },
  arrowRight: {
    end: 16,
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 30,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
  },
  tagBanner: {
    minHeight: 44,
    backgroundColor: Colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  tagBannerText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 14,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 110,
    alignItems: "center",
  },
  actionText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
