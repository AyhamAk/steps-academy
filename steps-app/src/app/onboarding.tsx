import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "../components/Screen";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { checkInviteCode } from "../services/inviteApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const TOTAL_STEPS = 3;

/**
 * Sign-up by invitation. The code establishes which child the parent belongs
 * to, so this never asks for the child's name — it states it and asks for
 * confirmation, which is both friendlier and impossible to fake.
 *
 * A parent walks through this exactly once. Afterwards they have an account
 * and use the ordinary login screen, so no code ever appears again.
 */
export default function OnboardingScreen() {
  const { t, rtlText } = useTranslation();
  const { isLoading, error, register } = useAuth();

  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [childName, setChildName] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasConsented, setHasConsented] = useState(false);
  const [wantsNotifications, setWantsNotifications] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);

  const goBack = () => {
    setFormError(null);
    if (step === 1) return router.back();
    setStep((current) => current - 1);
  };

  const handleCheckCode = async () => {
    setFormError(null);
    setIsChecking(true);
    try {
      const { studentName } = await checkInviteCode(code);
      setChildName(studentName);
      setStep(2);
    } catch {
      // Every failure reads the same on the server, so there's nothing more
      // specific to say here.
      setFormError(t.invite.invalidCode);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDetails = () => {
    if (!name.trim()) return setFormError(t.auth.nameRequired);
    if (!EMAIL_REGEX.test(email.trim())) return setFormError(t.auth.emailInvalid);
    if (password.length < MIN_PASSWORD_LENGTH) return setFormError(t.auth.passwordTooShort);
    setFormError(null);
    setStep(3);
  };

  const handleCreate = async () => {
    if (!hasConsented) return setFormError(t.invite.consentRequired);
    setFormError(null);
    const ok = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      inviteCode: code,
    });
    if (ok) router.replace("/(tabs)");
  };

  const message = formError ?? error;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepsLogo />
          <Text style={styles.stepLabel}>{t.invite.stepOf(step, TOTAL_STEPS)}</Text>

          {step === 1 ? (
            <>
              <Text style={[styles.title, rtlText]}>{t.invite.enterCodeTitle}</Text>
              <Text style={[styles.subtitle, rtlText]}>{t.invite.enterCodeSubtitle}</Text>
              <TextInput
                style={styles.codeInput}
                placeholder={t.invite.codePlaceholder}
                placeholderTextColor={Colors.textLight}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={9}
              />
              <StepsButton
                label={isChecking ? t.invite.checking : t.invite.checkCode}
                onPress={handleCheckCode}
                loading={isChecking}
                style={styles.primaryButton}
              />
            </>
          ) : null}

          {step === 2 && childName ? (
            <>
              <Text style={[styles.title, rtlText]}>
                {t.invite.confirmChildTitle(childName)}
              </Text>
              <Text style={[styles.subtitle, rtlText]}>{t.invite.confirmChildSubtitle}</Text>

              <Text style={[styles.sectionLabel, rtlText]}>{t.invite.yourDetailsTitle}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.auth.namePlaceholder}
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder={t.auth.passwordPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <StepsButton
                label={t.invite.checkCode}
                onPress={handleDetails}
                style={styles.primaryButton}
              />
              <Touchable onPress={goBack} style={styles.linkButton}>
                <Text style={styles.link}>{t.invite.notRightChild}</Text>
              </Touchable>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={[styles.title, rtlText]}>{t.invite.finishTitle}</Text>

              <View style={styles.switchRow}>
                <Switch
                  value={hasConsented}
                  onValueChange={setHasConsented}
                  trackColor={{ true: Colors.forest, false: Colors.border }}
                />
                <Text style={[styles.switchLabel, rtlText]}>{t.invite.consentLabel}</Text>
              </View>

              <View style={styles.switchRow}>
                <Switch
                  value={wantsNotifications}
                  onValueChange={setWantsNotifications}
                  trackColor={{ true: Colors.forest, false: Colors.border }}
                />
                <Text style={[styles.switchLabel, rtlText]}>{t.invite.notifyLabel}</Text>
              </View>

              <StepsButton
                label={t.invite.createAccount}
                onPress={handleCreate}
                loading={isLoading}
                style={styles.primaryButton}
              />
            </>
          ) : null}

          {isLoading && step === 3 ? (
            <ActivityIndicator color={Colors.terracotta} style={styles.spinner} />
          ) : null}

          {message ? <Text style={styles.error}>{message}</Text> : null}

          {step !== 2 ? (
            <Touchable onPress={goBack} style={styles.linkButton}>
              <Text style={styles.link}>{t.common.back}</Text>
            </Touchable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  stepLabel: {
    ...Type.caption,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  title: { ...Type.heading, color: Colors.text, marginBottom: 6 },
  subtitle: { ...Type.body, color: Colors.textLight, marginBottom: 24 },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    marginTop: 8,
    marginBottom: 12,
  },
  // Codes are short and read aloud over the phone as often as they're pasted,
  // so they get big, spaced, monospaced-feeling treatment.
  codeInput: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    fontFamily: Fonts.bold,
    fontSize: 26,
    letterSpacing: 4,
    textAlign: "center",
    color: Colors.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Type.body,
    color: Colors.text,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  switchLabel: { ...Type.body, color: Colors.text, flex: 1 },
  primaryButton: { marginTop: 8 },
  linkButton: { marginTop: 18, alignSelf: "center" },
  link: { ...Type.body, color: Colors.terracotta, fontFamily: Fonts.bold },
  spinner: { marginTop: 16 },
  error: {
    ...Type.caption,
    color: Colors.clay,
    textAlign: "center",
    marginTop: 16,
  },
});
