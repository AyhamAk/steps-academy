import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";

import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { Screen } from "../components/Screen";
import { AuthTextField } from "../components/auth/AuthTextField";
import { BirthDateField } from "../components/auth/BirthDateField";
import { StepProgressHeader } from "../components/auth/StepProgressHeader";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { Type } from "../constants/Typography";
import { track } from "../services/analytics";
import { useTranslation } from "../i18n/useTranslation";
import { useAuth } from "../hooks/useAuth";

type Step = "child" | "details" | "finish";

/**
 * Sign-up, one screen for every family, reached only with a verified number.
 *
 * - Nursery families: the academy saved this number on their child, so the
 *   sign-in screen already knows who they are. This states the child's name
 *   and asks only for the parent's own — no code, nothing to type wrong.
 * - Course families: the academy doesn't have their number. They type their
 *   child in. That child gets them into courses and nothing more: photos
 *   still only ever follow the admin's tags.
 *
 * A parent walks through this exactly once. Afterwards the same number signs
 * them straight in.
 */
export default function OnboardingScreen() {
  const { t, rtlText } = useTranslation();
  const { isLoading, error, registerWithPhone } = useAuth();
  // Proof, from the sign-in screen, that this phone number was just verified,
  // and the children the academy has that number on (newline-separated).
  const { signupToken, matched } = useLocalSearchParams<{ signupToken?: string; matched?: string }>();
  const matchedChildren = (matched ?? "").split("\n").filter(Boolean);
  const isNursery = matchedChildren.length > 0;

  const steps: Step[] = isNursery ? ["details", "finish"] : ["child", "details", "finish"];
  const [step, setStep] = useState<Step>(steps[0]);
  const stepIndex = steps.indexOf(step);

  const [ownChildName, setOwnChildName] = useState("");
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [hasConsented, setHasConsented] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const goBack = () => {
    setFormError(null);
    if (stepIndex <= 0) return router.back();
    setStep(steps[stepIndex - 1]);
  };

  const handleChild = () => {
    if (!ownChildName.trim()) return setFormError(t.invite.childNameRequired);
    if (!birthDate) return setFormError(t.invite.birthDateInvalid);
    setFormError(null);
    track("onboarding_step_completed", { step: "child" });
    setStep("details");
  };

  const handleDetails = () => {
    if (!firstName.trim() || !familyName.trim()) return setFormError(t.auth.namesRequired);
    setFormError(null);
    track("onboarding_step_completed", { step: "details" });
    setStep("finish");
  };

  const handleCreate = async () => {
    if (!hasConsented) return setFormError(t.invite.consentRequired);
    setFormError(null);
    track("onboarding_step_completed", { step: "consent" });
    if (!signupToken) return;
    const ok = await registerWithPhone({
      signupToken,
      firstName: firstName.trim(),
      familyName: familyName.trim(),
      // A nursery family's children are found by their number on the server.
      ...(!isNursery && birthDate
        ? { child: { name: ownChildName.trim(), birthDate } }
        : {}),
    });
    if (ok) router.replace("/(tabs)");
  };

  const message = formError ?? error;

  // Sign-up only ever starts from a verified number on the sign-in screen.
  if (!signupToken) return <Redirect href="/auth" />;

  return (
    <Screen safeBottom>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StepProgressHeader
          totalSteps={steps.length}
          currentStep={stepIndex + 1}
          onBack={goBack}
        />
        <StepsLogo maxWidth={100} />

        {step === "child" ? (
          <>
            <Text style={[styles.title, rtlText]}>{t.invite.childTitle}</Text>
            <Text style={[styles.subtitle, rtlText]}>{t.invite.childSubtitle}</Text>
            <Text style={[styles.nurseryHint, rtlText]}>{t.invite.nurseryHint}</Text>
            <AuthTextField
              label={t.invite.childNamePlaceholder}
              value={ownChildName}
              onChangeText={setOwnChildName}
              maxLength={60}
            />
            <BirthDateField value={birthDate} onChange={setBirthDate} />
            <StepsButton
              label={t.invite.checkCode}
              onPress={handleChild}
              style={styles.primaryButton}
              flat
            />
          </>
        ) : null}

        {step === "details" ? (
          <>
            {isNursery ? (
              <>
                <Text style={[styles.title, rtlText]}>
                  {t.invite.confirmChildTitle(matchedChildren)}
                </Text>
                <Text style={[styles.subtitle, rtlText]}>{t.invite.confirmChildSubtitle}</Text>
              </>
            ) : null}

            <Text style={[styles.sectionLabel, rtlText]}>{t.invite.yourDetailsTitle}</Text>
            <AuthTextField
              label={t.auth.firstNameLabel}
              value={firstName}
              onChangeText={setFirstName}
              textContentType="givenName"
              maxLength={40}
            />
            <AuthTextField
              label={t.auth.familyNameLabel}
              value={familyName}
              onChangeText={setFamilyName}
              textContentType="familyName"
              maxLength={40}
            />
            <StepsButton
              label={t.invite.checkCode}
              onPress={handleDetails}
              style={styles.primaryButton}
              flat
            />
          </>
        ) : null}

        {step === "finish" ? (
          <>
            <Text style={[styles.title, rtlText]}>{t.invite.finishTitle}</Text>

            <View style={styles.switchRow}>
              <Switch
                value={hasConsented}
                onValueChange={setHasConsented}
                trackColor={{ true: Colors.coral, false: Colors.border }}
              />
              <Text style={[styles.switchLabel, rtlText]}>{t.invite.consentLabel}</Text>
            </View>

            <StepsButton
              label={t.invite.createAccount}
              onPress={handleCreate}
              loading={isLoading}
              style={styles.primaryButton}
              flat
            />
          </>
        ) : null}

        {isLoading && step === "finish" ? (
          <ActivityIndicator color={Colors.sage} style={styles.spinner} />
        ) : null}

        {message ? <Text style={styles.error}>{message}</Text> : null}

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
  nurseryHint: { ...Type.caption, color: Colors.textLight, marginTop: -12, marginBottom: 20 },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.bark,
    marginTop: 8,
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
    color: Colors.rose,
    textAlign: "center",
    marginTop: 16,
  },
});
