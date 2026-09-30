import { ReactNode } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * A labelled, bordered field for the sign-in and sign-up screens. The label
 * sits above the box rather than inside it as a placeholder, so it is still
 * there once the parent starts typing.
 */
export function AuthTextField({
  label,
  trailing,
  style,
  ...inputProps
}: TextInputProps & { label: string; trailing?: ReactNode }) {
  const { isRTL } = useTranslation();
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <View style={[styles.box, isRTL && styles.rowReverse]}>
        <TextInput
          placeholderTextColor={Colors.textLight}
          {...inputProps}
          style={[styles.input, { textAlign }, style]}
        />
        {trailing}
      </View>
    </View>
  );
}

/** The same box, as a tap target — for fields that open a picker. */
export const authFieldStyles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.linen,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  value: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.bark },
});

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  rowReverse: { flexDirection: "row-reverse" },
  label: authFieldStyles.label,
  box: authFieldStyles.box,
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.bark,
    paddingVertical: 13,
  },
});
