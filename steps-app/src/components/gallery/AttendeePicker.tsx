import { StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { Student } from "../../services/studentsApi";
import { Touchable } from "../ui/Touchable";

type Props = {
  students: Student[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

/**
 * The "kids who attended" chips, shared by the create and edit album sheets.
 *
 * Both sheets had their own copy of this list, drifting apart in chip padding
 * and text size; the select-all control would have had to be written twice to
 * behave the same way.
 *
 * Select all is a single toggle rather than two buttons: with everyone already
 * picked the only thing left to want is to start over, so the same control
 * clears. An album is usually the whole class, which made tapping twenty-odd
 * chips the normal case rather than the exception.
 */
export function AttendeePicker({ students, selectedIds, onChange }: Props) {
  const { t, isRTL, rtlText } = useTranslation();

  const allSelected = students.length > 0 && selectedIds.length === students.length;

  return (
    <View>
      <View style={[styles.labelRow, isRTL && styles.rowReverse]}>
        <Text style={[styles.label, rtlText]}>{t.gallery.kidsWhoAttended}</Text>
        {students.length > 0 ? (
          <Touchable
            onPress={() => onChange(allSelected ? [] : students.map((student) => student.id))}
            hitSlop={12}
          >
            <Text style={styles.toggle}>
              {allSelected ? t.gallery.clearAllKids : t.gallery.selectAllKids}
            </Text>
          </Touchable>
        ) : null}
      </View>

      {students.length === 0 ? (
        <Text style={[styles.emptyText, rtlText]}>{t.gallery.noStudentsYet}</Text>
      ) : (
        <View style={[styles.grid, isRTL && styles.rowReverse]}>
          {students.map((student) => {
            const isSelected = selectedIds.includes(student.id);
            return (
              <Touchable
                key={student.id}
                onPress={() =>
                  onChange(
                    isSelected
                      ? selectedIds.filter((id) => id !== student.id)
                      : [...selectedIds, student.id]
                  )
                }
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {isSelected ? "✓ " : ""}
                  {student.name}
                </Text>
              </Touchable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  rowReverse: { flexDirection: "row-reverse" },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textLight,
  },
  toggle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.terracotta,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  chipText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.bark },
  chipTextSelected: { color: Colors.cream },
  emptyText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight },
});
