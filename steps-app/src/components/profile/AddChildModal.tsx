import axios from "axios";
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useSheetPadding } from "../../hooks/useLayout";
import { useTranslation } from "../../i18n/useTranslation";
import { meRequest } from "../../services/authApi";
import { addMyChild } from "../../services/studentsApi";
import { useAuthStore } from "../../store/authStore";
import { BirthDateField } from "../auth/BirthDateField";
import { StepsButton } from "../ui/StepsButton";
import { Touchable } from "../ui/Touchable";

/**
 * A parent adds another child of their own — a course family with two kids.
 * The new child joins courses straight away; photos still only follow the
 * admin's tags, so adding a name here reveals nothing.
 */
export function AddChildModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { t, rtlText } = useTranslation();
  const { sheetPadding, keyboardPadding } = useSheetPadding(32);
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setName("");
    setBirthDate(null);
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) return setError(t.invite.childNameRequired);
    const iso = birthDate;
    if (!iso) return setError(t.invite.birthDateInvalid);
    setIsSaving(true);
    setError(null);
    try {
      const child = await addMyChild({ name: name.trim(), birthDate: iso });
      // The children list lives on the user, so refetch it for every screen
      // that reads useChildren — courses, Home and this one.
      const user = await meRequest();
      if (token) setSession(token, user);
      onSuccess(t.invite.addChildSuccess(child.name));
      close();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : t.invite.addOwnChildFailed;
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.backdrop, { paddingBottom: keyboardPadding }]}>
        <View style={[styles.sheet, { paddingBottom: sheetPadding }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.invite.addOwnChild}</Text>
            <Touchable onPress={close} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>
          <Text style={[styles.subtitle, rtlText]}>{t.invite.addOwnChildSubtitle}</Text>

          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            placeholder={t.invite.childNamePlaceholder}
            placeholderTextColor={Colors.textLight}
            style={[styles.input, rtlText]}
            maxLength={60}
          />

          <BirthDateField
            value={birthDate}
            onChange={(v) => {
              setBirthDate(v);
              setError(null);
            }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <StepsButton
            label={t.invite.addOwnChildSave}
            onPress={handleSave}
            loading={isSaving}
            style={styles.button}
          />
        </View>
      </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.text },
  close: { fontSize: 20, color: Colors.textLight },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
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
    marginBottom: 12,
  },
  error: {
    fontFamily: Fonts.semiBold,
    color: Colors.rose,
    marginTop: 4,
    textAlign: "center",
  },
  button: { marginTop: 16 },
});
