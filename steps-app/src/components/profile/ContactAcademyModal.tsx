import { Ionicons } from "@expo/vector-icons";
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
  const { t, isRTL, rtlText } = useTranslation();

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

  const options: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    label: string;
    url: string;
  }[] = [
    {
      key: "call",
      icon: "call-outline",
      tint: Colors.forest,
      label: t.profile.contactCall,
      url: `tel:${ACADEMY_CONTACT.phone}`,
    },
    {
      key: "whatsapp",
      icon: "logo-whatsapp",
      tint: Colors.forest,
      label: t.profile.contactWhatsApp,
      url: `https://wa.me/${ACADEMY_CONTACT.whatsapp}`,
    },
    {
      key: "email",
      icon: "mail-outline",
      tint: Colors.sky,
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
              <View style={[styles.optionInner, isRTL && styles.optionInnerRTL]}>
                <View style={[styles.optionIconWrap, { backgroundColor: `${option.tint}20` }]}>
                  <Ionicons name={option.icon} size={18} color={option.tint} />
                </View>
                <Text style={[styles.optionLabel, rtlText]} numberOfLines={1} ellipsizeMode="tail">
                  {option.label}
                </Text>
                <Text style={styles.optionChevron}>{isRTL ? "‹" : "›"}</Text>
              </View>
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
    backgroundColor: Colors.linen,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionInnerRTL: {
    flexDirection: "row-reverse",
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
