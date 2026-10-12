import { Image, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Photo, resolvePhotoUrl } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";

/** "0:42", "1:40" — Latin digits, always shown left to right. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A video in an album: its poster, a play button and the length.
 * "row" is the tall card in the album's sideways videos strip; "grid" fills
 * a cell of the two-column videos view, so its width comes from the screen.
 */
export function VideoCard({
  item,
  size,
  width,
  onPress,
}: {
  item: Photo;
  size: "row" | "grid";
  width?: number;
  onPress: () => void;
}) {
  const isRow = size === "row";
  return (
    <Touchable
      onPress={onPress}
      style={[styles.videoCard, isRow ? styles.videoCardRow : [styles.videoCardGrid, { width }]]}
    >
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: resolvePhotoUrl(item.thumbnailUrl) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.playCircleWrap}>
        <View style={[styles.playCircle, !isRow && styles.playCircleBig]}>
          <Text style={[styles.playIcon, !isRow && styles.playIconBig]}>▶</Text>
        </View>
      </View>
      {/* Bottom-left in every language, as video apps do. */}
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{formatDuration(item.durationSec ?? 0)}</Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  videoCardRow: { width: 96, height: 128 },
  videoCardGrid: { aspectRatio: 3 / 4, borderRadius: 18 },

  playCircleWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    opacity: 0.94,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircleBig: { width: 46, height: 46, borderRadius: 23 },
  // Nudged right so the triangle looks centred in its circle.
  playIcon: { fontSize: 14, color: Colors.primary, marginLeft: 2 },
  playIconBig: { fontSize: 17 },

  durationBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    // The one colour that isn't a token: a dim overlay readable on any poster.
    backgroundColor: "rgba(44,36,22,0.55)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.background,
    writingDirection: "ltr",
  },
});
