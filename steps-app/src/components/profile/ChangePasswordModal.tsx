import axios from "axios";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";
import { changePasswordRequest } from "../../services/authApi";
import { StepsButton } from "../ui/StepsButton";

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function ChangePasswordModal({ visible, onClose, onSuccess }: ChangePasswordModalProps) {
  const { t, rtlText } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      return setError(t.auth.passwordTooShort);
    }
    if (next.length < 8) {
      return setError(t.auth.passwordTooShort);
    }
    if (next !== confirm) {
      return setError(t.profile.passwordsDontMatch);
    }
    setIsSaving(true);
    setError(null);
    try {
      await changePasswordRequest({ currentPassword: current, newPassword: next });
      reset();
      onSuccess(t.profile.passwordUpdated);
      onClose();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : t.profile.couldntChangePassword;
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.profile.changePasswordTitle}</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, rtlText]}>{t.profile.currentPasswordLabel}</Text>
          <TextInput
            value={current}
            onChangeText={(v) => {
              setCurrent(v);
              setError(null);
            }}
            secureTextEntry
            placeholderTextColor={Colors.textLight}
            style={styles.input}
          />

          <Text style={[styles.label, rtlText]}>{t.profile.newPasswordLabel}</Text>
          <TextInput
            value={next}
            onChangeText={(v) => {
              setNext(v);
              setError(null);
            }}
            secureTextEntry
            placeholderTextColor={Colors.textLight}
            style={styles.input}
          />

          <Text style={[styles.label, rtlText]}>{t.profile.confirmPasswordLabel}</Text>
          <TextInput
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              setError(null);
            }}
            secureTextEntry
            placeholderTextColor={Colors.textLight}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <StepsButton
            label={isSaving ? t.profile.updatingPassword : t.profile.updatePasswordButton}
            onPress={handleSave}
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 22, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.text,
  },
  close: {
    fontSize: 20,
    color: Colors.textLight,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  error: {
    fontFamily: Fonts.semiBold,
    color: Colors.clay,
    marginTop: 12,
    textAlign: "center",
  },
  button: {
    marginTop: 20,
  },
});
