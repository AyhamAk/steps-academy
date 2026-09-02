import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * What today looks like for the selected child.
 *
 * Both counters come from data Home has already fetched — the gallery and the
 * timetable — rather than a new endpoint, so switching children costs nothing
 * and the card can never be the thing that makes Home wait.
 */
export function ProgramCard({
  childName,
  programName,
  photoCount,
  activityCount,
}: {
  childName: string;
  programName: string | null;
  photoCount: number;
  activityCount: number;
}) {
  const { t, isRTL, rtlText } = useTranslation();

  return (
    <View style={[styles.card, isRTL ? styles.cardRTL : styles.cardLTR]}>
      <Text style={[styles.label, rtlText]} maxFontSizeMultiplier={1.3}>
        {t.home.programLabel(childName).toUpperCase()}
      </Text>
      {programName ? (
        <Text style={[styles.program, rtlText]} maxFontSizeMultiplier={1.3}>
          {programName}
        </Text>
      ) : null}
      <View style={[styles.stats, isRTL && styles.rowReverse]}>
        <Stat value={photoCount} label={t.home.programPhotos} />
        <Stat value={activityCount} label={t.home.programActivities} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { rtlText } = useTranslation();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={[styles.statLabel, rtlText]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EEF3F8",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  // The accent rail sits on the side the text starts from, so it reads as a
  // margin rule rather than a stray bar at the end of the card.
  cardLTR: {
    borderLeftWidth: 4,
    borderLeftColor: "#7B9EC4",
  },
  cardRTL: {
    borderRightWidth: 4,
    borderRightColor: "#7B9EC4",
  },
  label: {
    ...Type.caption,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    color: Colors.textLight,
  },
  program: {
    ...Type.heading,
    fontFamily: Fonts.bold,
    color: Colors.bark,
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    gap: 28,
    marginTop: 14,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  stat: {
    minWidth: 64,
  },
  statValue: {
    ...Type.heading,
    fontFamily: Fonts.bold,
    color: "#3E6389",
  },
  statLabel: {
    ...Type.caption,
    color: Colors.textLight,
  },
});
