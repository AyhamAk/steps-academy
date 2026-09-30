import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { Screen } from "../components/Screen";
import {
  BirthDateInput,
  BirthDateParts,
  EMPTY_BIRTH_DATE,
  toIsoBirthDate,
} from "../components/ui/BirthDateInput";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { track } from "../services/analytics";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { checkInviteCode } from "../services/inviteApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type Step = "code" | "child" | "details" | "finish";

/**
 * Sign-up, one screen for every family.
 *
 * - Nursery families have an invite code. The code establishes which child
 *   they belong to, so this never asks for the child's name — it states it
 *   and asks for confirmation, which is friendlier and impossible to fake.
 * - Course families have no code. They tap "I don't have a code" and type
 *   their child in. That child gets them into courses and nothing more:
 *   photos still only ever follow the admin's tags.
 *
 * A parent walks through this exactly once. Afterwards they have an account
 * and use the ordinary login screen.
 */
export default function OnboardingScreen() {
  const { t, rtlText } = useTranslation();
  const { isLoading, error, register } = useAuth();

  const [mode, setMode] = useState<"code" | "courses">("code");
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [childName, setChildName] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [ownChildName, setOwnChildName] = useState("");
  const [birthDate, setBirthDate] = useState<BirthDateParts>(EMPTY_BIRTH_DATE);

  const steps: Step[] =
    mode === "code" ? ["code", "details", "finish"] : ["code", "child", "details", "finish"];
  const stepIndex = steps.indexOf(step);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasConsented, setHasConsented] = useState(false);
  const [wantsNotifications, setWantsNotifications] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);

  const goBack = () => {
    setFormError(null);
    if (stepIndex <= 0) return router.back();
    const previous = steps[stepIndex - 1];
    // Back to the code screen means back to having a choice of path.
    if (previous === "code") setMode("code");
    setStep(previous);
  };

  const startWithoutCode = () => {
    setFormError(null);
    setMode("courses");
    track("onboarding_step_completed", { step: "no_code" });
    setStep("child");
  };

  const handleChild = () => {
    if (!ownChildName.trim()) return setFormError(t.invite.childNameRequired);
    if (!toIsoBirthDate(birthDate)) return setFormError(t.invite.birthDateInvalid);
    setFormError(null);
    track("onboarding_step_completed", { step: "child" });
    setStep("details");
  };

  const handleCheckCode = async () => {
    setFormError(null);
    setIsChecking(true);
    try {
      const { studentName } = await checkInviteCode(code);
      setChildName(studentName);
      track("invite_code_entered", { success: true });
      track("onboarding_step_completed", { step: "invite_code" });
      setStep("details");
    } catch {
      // Every failure reads the same on the server, so there's nothing more
      // specific to say here.
      // The server answers every bad code identically on purpose, so the
      // reason recorded here is only ever "rejected", never the code itself.
      track("invite_code_entered", { success: false, reason: "rejected" });
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
    track("onboarding_step_completed", { step: "details" });
    setStep("finish");
  };

  const handleCreate = async () => {
    if (!hasConsented) return setFormError(t.invite.consentRequired);
    setFormError(null);
    track("onboarding_step_completed", { step: "consent" });
    const birthDateIso = toIsoBirthDate(birthDate);
    const ok = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      ...(mode === "code"
        ? { inviteCode: code }
        : birthDateIso
          ? { child: { name: ownChildName.trim(), birthDate: birthDateIso } }
          : {}),
    });
    if (ok) router.replace("/(tabs)");
  };

  const message = formError ?? error;

  return (
    <Screen safeBottom>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StepsLogo />
        <Text style={styles.stepLabel}>{t.invite.stepOf(stepIndex + 1, steps.length)}</Text>

        {step === "code" ? (
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
              // Lets iOS offer the code above the keyboard when it arrives by
              // SMS, so a parent taps once instead of switching apps to copy
              // it. Only works for SMS — WhatsApp messages are invisible to
              // the OS — so it helps the share-sheet-to-Messages route.
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
            <StepsButton
              label={isChecking ? t.invite.checking : t.invite.checkCode}
              onPress={handleCheckCode}
              loading={isChecking}
              style={styles.primaryButton}
            />
            <Touchable onPress={startWithoutCode} style={styles.linkButton}>
              <Text style={[styles.link, styles.linkCentered]}>{t.invite.noCode}</Text>
            </Touchable>
          </>
        ) : null}

        {step === "child" ? (
          <>
            <Text style={[styles.title, rtlText]}>{t.invite.childTitle}</Text>
            <Text style={[styles.subtitle, rtlText]}>{t.invite.childSubtitle}</Text>
            <TextInput
              style={[styles.input, rtlText]}
              placeholder={t.invite.childNamePlaceholder}
              placeholderTextColor={Colors.textLight}
              value={ownChildName}
              onChangeText={setOwnChildName}
              maxLength={60}
            />
            <Text style={[styles.fieldLabel, rtlText]}>{t.invite.birthDateLabel}</Text>
            <BirthDateInput value={birthDate} onChange={setBirthDate} />
            <StepsButton
              label={t.invite.checkCode}
              onPress={handleChild}
              style={styles.primaryButton}
            />
          </>
        ) : null}

        {step === "details" && (mode === "courses" || childName) ? (
          <>
            {mode === "code" && childName ? (
              <>
                <Text style={[styles.title, rtlText]}>
                  {t.invite.confirmChildTitle(childName)}
                </Text>
                <Text style={[styles.subtitle, rtlText]}>{t.invite.confirmChildSubtitle}</Text>
              </>
            ) : null}

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
            {mode === "code" ? (
              <Touchable onPress={goBack} style={styles.linkButton}>
                <Text style={styles.link}>{t.invite.notRightChild}</Text>
              </Touchable>
            ) : null}
          </>
        ) : null}

        {step === "finish" ? (
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

        {isLoading && step === "finish" ? (
          <ActivityIndicator color={Colors.terracotta} style={styles.spinner} />
        ) : null}

        {message ? <Text style={styles.error}>{message}</Text> : null}

        {/* The code path's details step has its own "not my child" back link. */}
        {!(step === "details" && mode === "code") ? (
          <Touchable onPress={goBack} style={styles.linkButton}>
            <Text style={styles.link}>{t.common.back}</Text>
          </Touchable>
        ) : null}
      </KeyboardAwareScrollView>
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
  linkCentered: { textAlign: "center" },
  fieldLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    marginBottom: 6,
  },
  spinner: { marginTop: 16 },
  error: {
    ...Type.caption,
    color: Colors.clay,
    textAlign: "center",
    marginTop: 16,
  },
});
