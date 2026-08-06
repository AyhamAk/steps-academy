import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ACADEMY_CONTACT } from "../../constants/academy";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Fonts";
import { useTranslation } from "../../i18n/useTranslation";

type ContactAcademyModalProps = {
  visible: boolean;
  onClose: () => void;
  onError: (message: string) => void;
};

export function ContactAcademyModal({ visible, onClose, onError }: ContactAcademyModalProps) {
  const { t } = useTranslation();

  const open = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        onError(t.profile.contactCouldntOpen);
        return;
      }
      await Linking.openURL(url);
      onClose();
    } catch {
      onError(t.profile.contactCouldntOpen);
    }
  };

  const options = [
    { key: "call", emoji: "📞", label: t.profile.contactCall, url: `tel:${ACADEMY_CONTACT.phone}` },
    {
      key: "whatsapp",
      emoji: "💬",
      label: t.profile.contactWhatsApp,
      url: `https://wa.me/${ACADEMY_CONTACT.whatsapp}`,
    },
    {
      key: "email",
      emoji: "✉️",
      label: t.profile.contactEmail,
      url: `mailto:${ACADEMY_CONTACT.email}`,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t.profile.contactTitle}</Text>
              <Text style={styles.subtitle}>{t.profile.contactSubtitle}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {options.map((option) => (
            <Pressable
              key={option.key}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => open(option.url)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
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
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  close: {
    fontSize: 20,
    color: Colors.textLight,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionEmoji: {
    fontSize: 20,
    marginEnd: 12,
  },
  optionLabel: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.bark,
  },
  optionChevron: {
    fontSize: 22,
    color: Colors.textLight,
  },
});
