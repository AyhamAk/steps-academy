import { router } from "expo-router";
import { Image, Linking, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Tip } from "../../services/tipsApi";
import { tipExcerpt, tipTitle } from "../../utils/tipText";
import { youtubeThumbnail } from "../../utils/youtube";
import { CardWash } from "../ui/CardWash";
import { Touchable } from "../ui/Touchable";

/**
 * This month's parenting tip, under the nursery timetable.
 *
 * The same tip the Tips pillar features, not a second tip system: it is the
 * head of the published list. A tip with a YouTube link shows as a video —
 * the still opens the video, the rest of the card opens the Tips screen.
 */
export function ParentTipCard({ tip }: { tip: Tip }) {
  const { t, isRTL, locale } = useTranslation();
  const textAlign = isRTL ? "right" : "left";

  const title = tipTitle(tip, locale);
  const description = tipExcerpt(tip, locale);
  const thumbnail = tip.youtubeUrl ? youtubeThumbnail(tip.youtubeUrl) : null;

  return (
    <Touchable
      onPress={() => router.push("/academy/tips")}
      accessibilityLabel={title}
      style={styles.card}
    >
      <CardWash index={1} />
      <Text
        style={[styles.eyebrow, { textAlign }]}
        maxFontSizeMultiplier={1.2}
      >
        💡 {t.academy.tipForParent}
      </Text>

      {tip.youtubeUrl && thumbnail ? (
        <>
          <Touchable
            onPress={() => void Linking.openURL(tip.youtubeUrl!)}
            accessibilityLabel={t.academy.tipWatchVideo}
            style={styles.thumbnailWrap}
          >
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </Touchable>
          <Text
            style={[styles.title, { textAlign }]}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[styles.description, { textAlign }]}
              maxFontSizeMultiplier={1.3}
            >
              {description}
            </Text>
          ) : null}
        </>
      ) : (
        <View
          style={[
            styles.textRow,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.iconTile}>
            <Text style={styles.iconGlyph}>{tip.emoji}</Text>
          </View>
          <View style={styles.textCol}>
            <Text
              style={[styles.title, { textAlign }]}
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            {description ? (
              <Text
                style={[styles.description, { textAlign }]}
                maxFontSizeMultiplier={1.3}
              >
                {description}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  // The nursery's Today card, in the tips pillar's gold instead of blue.
  card: {
    overflow: "hidden",
    backgroundColor: Colors.goldLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 18,
  },
  eyebrow: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.goldDeep,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  thumbnailWrap: {
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 16 / 9,
    // Dark while the still loads, so the play button never sits on blank gold.
    backgroundColor: Colors.bark,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnail: { ...StyleSheet.absoluteFillObject },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.cream,
    opacity: 0.92,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: { fontSize: 16, color: Colors.coral, marginLeft: 2 },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.bark,
    marginBottom: 2,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textLight,
  },
  textRow: { gap: 12, alignItems: "flex-start" },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    justifyContent: "center",
    alignItems: "center",
  },
  iconGlyph: { fontSize: 20 },
  textCol: { flex: 1, minWidth: 0 },
});
