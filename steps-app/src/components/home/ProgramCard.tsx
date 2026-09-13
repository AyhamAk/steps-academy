import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Where the selected child stands, in three numbers.
 *
 * Courses first: it is the one that holds still. Activities and photos both
 * reset overnight, so a parent checking twice in a day expects those to move
 * and this one not to.
 */
export function ProgramCard({
  childName,
  programName,
  courseCount,
  activityCount,
  photoCount,
}: {
  childName: string;
  programName: string | null;
  courseCount: number;
  activityCount: number;
  photoCount: number;
}) {
  const { t, isRTL } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={1.3}>
        {t.home.programLabel(childName)}
        {programName ? ` · ${programName}` : ""}
      </Text>

      <View style={[styles.row, isRTL && styles.rowReverse]}>
        <Stat icon="school-outline" value={courseCount} label={t.home.programCourses} />
        <View style={styles.divider} />
        <Stat icon="sparkles-outline" value={activityCount} label={t.home.programActivities} />
        <View style={styles.divider} />
        <Stat icon="camera-outline" value={photoCount} label={t.home.programPhotos} />
      </View>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.col}>
      <Ionicons name={icon} size={18} color={Colors.sky} />
      <Text style={styles.value} maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * A flat bordered card, all four sides.
   *
   * It used to carry a 4px accent on one edge only. Against a border radius,
   * React Native mitres that single edge into the corner curve, which read as
   * a stray hook protruding from the card rather than as a rail — and it
   * landed on the right in Arabic, where it was most visible.
   */
  card: {
    backgroundColor: Colors.skyTint,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.skyDeep,
    textAlign: "center",
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowReverse: { flexDirection: "row-reverse" },
  col: { flex: 1, alignItems: "center" },
  value: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.bark,
    marginTop: 6,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: "center",
  },
  divider: {
    width: 1,
    backgroundColor: Colors.sky,
    opacity: 0.35,
    marginHorizontal: 4,
  },
});
