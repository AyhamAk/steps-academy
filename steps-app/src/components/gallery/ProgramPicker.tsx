import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Program, PROGRAMS } from "../../services/galleryApi";
import { Touchable } from "../ui/Touchable";

/** The label for a program, in the current language. */
export function useProgramLabel() {
  const { t } = useTranslation();
  return (program: Program) =>
    program === "nursery"
      ? t.gallery.programNursery
      : program === "courses"
        ? t.gallery.programCourses
        : t.gallery.programBoth;
}

/**
 * Nursery / Courses / Both — which gallery an album shows up in.
 *
 * `value` may be null: a new album starts with nothing chosen, so the admin
 * has to decide rather than accept a default without noticing.
 */
export function ProgramPicker({
  value,
  onChange,
}: {
  value: Program | null;
  onChange: (program: Program) => void;
}) {
  const { t, isRTL, rtlText } = useTranslation();
  const labelOf = useProgramLabel();

  return (
    <View>
      <Text style={[styles.label, rtlText]}>{t.gallery.programLabel}</Text>
      <View style={[styles.row, isRTL && styles.rowReverse]}>
        {PROGRAMS.map((program) => {
          const isActive = value === program;
          return (
            <Touchable
              key={program}
              accessibilityLabel={labelOf(program)}
              onPress={() => onChange(program)}
              style={[styles.option, isActive && styles.optionActive]}
            >
              <Text
                style={[styles.optionText, isActive && styles.optionTextActive]}
                maxFontSizeMultiplier={1.3}
              >
                {labelOf(program)}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

/** Small tinted tags saying where an album shows. "Both" shows both tags. */
export function ProgramBadges({ program }: { program: Program }) {
  const { t, isRTL } = useTranslation();
  const showNursery = program !== "courses";
  const showCourses = program !== "nursery";

  return (
    <View style={[styles.badges, isRTL && styles.rowReverse]}>
      {showNursery ? (
        <View style={[styles.badge, styles.badgeNursery]}>
          <Text
            style={[styles.badgeText, styles.badgeTextNursery]}
            maxFontSizeMultiplier={1.2}
          >
            {t.gallery.programNursery}
          </Text>
        </View>
      ) : null}
      {showCourses ? (
        <View style={[styles.badge, styles.badgeCourses]}>
          <Text
            style={[styles.badgeText, styles.badgeTextCourses]}
            maxFontSizeMultiplier={1.2}
          >
            {t.gallery.programCourses}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
    marginTop: 12,
  },
  row: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  optionActive: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  optionText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.bark },
  optionTextActive: { color: Colors.cream },

  badges: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeNursery: { backgroundColor: Colors.blueTint },
  badgeCourses: { backgroundColor: Colors.coralTint },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  badgeTextNursery: { color: Colors.blueDeep },
  badgeTextCourses: { color: Colors.coralDeep },
});
