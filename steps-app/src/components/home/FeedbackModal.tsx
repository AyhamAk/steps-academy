import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { FEEDBACK_FACES } from "../../constants/FeedbackFaces";
import { Fonts } from "../../constants/Fonts";
import { Type } from "../../constants/Typography";
import { useTranslation } from "../../i18n/useTranslation";
import { submitFeedback } from "../../services/feedbackApi";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

/**
 * A face to tap and an optional note. Rating alone is one tap, which is what
 * most people will give — the text box is there for the ones with something
 * to say.
 */
export function FeedbackModal({
  visible,
  onClose,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const { t, rtlText } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!visible) return;
    setRating(null);
    setMessage("");
  }, [visible]);

  const send = useMutation({
    mutationFn: () => submitFeedback(message.trim(), rating),
    onSuccess: () => {
      onClose();
      onSent(t.feedback.thanks);
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.feedback.title}</Text>
            <Touchable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>
          <Text style={[styles.subtitle, rtlText]}>{t.feedback.subtitle}</Text>

          <Text style={[styles.optionalLabel, rtlText]}>{t.feedback.ratingOptional}</Text>
          <View style={styles.faces}>
            {FEEDBACK_FACES.map((face) => (
              <Touchable
                key={face.rating}
                onPress={() => setRating(face.rating)}
                style={[styles.face, rating === face.rating && styles.faceActive]}
                accessibilityLabel={String(face.rating)}
              >
                <Text style={styles.faceEmoji}>{face.emoji}</Text>
              </Touchable>
            ))}
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t.feedback.placeholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.input, rtlText]}
            multiline
            maxLength={1000}
          />

          <StepsButton
            label={t.feedback.send}
            onPress={() => send.mutate()}
            loading={send.isPending}
            disabled={!message.trim()}
          />
          {send.isError ? <Text style={styles.error}>{t.feedback.failed}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(44, 36, 22, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.bark },
  close: { fontSize: 20, color: Colors.textLight },
  subtitle: { ...Type.caption, color: Colors.textLight, marginTop: 4 },
  optionalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textLight,
    marginTop: 20,
  },
  faces: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 18 },
  face: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.linen,
    alignItems: "center",
    justifyContent: "center",
  },
  faceActive: {
    borderColor: Colors.terracotta,
    backgroundColor: `${Colors.terracotta}1F`,
    transform: [{ scale: 1.06 }],
  },
  faceEmoji: { fontSize: 27 },
  input: {
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.bark,
    minHeight: 88,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  error: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.clay,
    textAlign: "center",
    marginTop: 12,
  },
});
