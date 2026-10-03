import { StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
};

/**
 * Six boxes, one digit each — drawn over a single real input.
 *
 * One input rather than six on purpose: the code from the SMS shows above the
 * keyboard (iOS oneTimeCode, Android sms-otp) and fills the whole field in one
 * tap. Six one-digit inputs would catch only its first digit. Typing and
 * deleting are the plain behaviour of one field, so there is no focus juggling.
 *
 * Always left to right, in every language: a code is read out and copied in
 * that order.
 */
export function OtpInput({ length = 6, value, onChange, accessibilityLabel }: OtpInputProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const isActive = i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[styles.box, value[i] ? styles.boxFilled : null, isActive && styles.boxActive]}
          >
            <Text style={styles.digit}>{value[i] ?? ""}</Text>
          </View>
        );
      })}
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        caretHidden
        accessibilityLabel={accessibilityLabel}
        // Covers the boxes, so a tap anywhere on them opens the keyboard.
        style={styles.hiddenInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    direction: "ltr",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  box: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  boxFilled: { borderColor: Colors.primary, borderWidth: 1.5 },
  boxActive: { borderColor: Colors.primary },
  digit: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.text },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    // Not 0: iOS stops offering autofill to a fully transparent field.
    opacity: 0.02,
    color: "transparent",
  },
});
