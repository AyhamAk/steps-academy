import { router } from "expo-router";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { Screen } from "../components/Screen";
import { AuthTextField } from "../components/auth/AuthTextField";
import { OtpInput } from "../components/auth/OtpInput";
import { StepsButton } from "../components/ui/StepsButton";
import { LanguagePicker } from "../components/ui/LanguagePicker";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Touchable } from "../components/ui/Touchable";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAuth } from "../hooks/useAuth";
import { useReduceMotionSetting } from "../hooks/useReduceMotionSetting";
import { useTranslation } from "../i18n/useTranslation";
import { isMobileNumber as isMobile, toLocalDisplay as displayPhone } from "../lib/phone";

/** Seconds before "send the code again" unlocks — each resend is a paid message. */
const RESEND_SECONDS = 30;

function AnimatedPanel({ children }: PropsWithChildren) {
  const reduceMotion = useReduceMotionSetting();
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 40)).current;
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 120,
        mass: 0.9,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

/**
 * The way into the app, for everyone: a mobile number and a code by SMS.
 *
 * - A number that already has an account is signed straight into it.
 * - A number we have never seen carries on to the sign-up screens, with a
 *   short-lived token proving it was verified.
 *
 * No email and no password. The server still accepts an email login, only so
 * copies of the app from before phone sign-in keep working until they update.
 */
export default function AuthScreen() {
  const { t, locale, isRTL } = useTranslation();
  const [step, setStep] = useState<"number" | "code">("number");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const { isLoading, error, startPhoneSignIn, verifyPhoneSignIn } = useAuth();

  // Counts the resend lock down to zero, once a second.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendCode = async () => {
    if (!isMobile(phone)) return setFormError(t.auth.phoneInvalid);
    setFormError(null);
    const ok = await startPhoneSignIn(phone, locale);
    if (ok) {
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    }
  };

  const checkCode = async (entered = code) => {
    if (entered.length < 6) return setFormError(t.auth.codeInvalid);
    setFormError(null);
    const result = await verifyPhoneSignIn(phone, entered);
    if (result === "signedIn") {
      // An existing account for this number.
      router.replace("/(tabs)");
    } else if (result) {
      // A new number: finish sign-up with proof it was verified.
      router.push({
        pathname: "/onboarding",
        // Children the academy already has this number on; "" when none.
        params: { signupToken: result.signupToken, matched: result.matchedChildren.join("\n") },
      });
    }
  };

  const message = formError ?? error;

  return (
    <Screen safeBottom>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* A mark, not a hero: at full size it pushed the form below the fold. */}
        <StepsLogo maxWidth={140} />

        <AnimatedPanel>
          <View style={styles.stack}>
            {step === "number" ? (
              <>
                <AuthTextField
                  label={t.auth.phoneLabel}
                  placeholder={t.auth.phonePlaceholder}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setFormError(null);
                  }}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  // Digits read left to right in every language.
                  style={styles.ltrField}
                />
                {message ? <Text style={styles.error}>{message}</Text> : null}
                <StepsButton label={t.auth.sendCode} onPress={sendCode} loading={isLoading} flat />
              </>
            ) : (
              <>
                <Text style={[styles.sentTo, { textAlign: isRTL ? "right" : "left" }]}>
                  {t.auth.codeSentLabel}
                </Text>
                {/* Its own line, held left to right: inside Arabic or Hebrew text the digit groups flip. */}
                <Text style={[styles.phoneDisplay, { textAlign: isRTL ? "right" : "left" }]}>
                  {displayPhone(phone)}
                </Text>
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setFormError(null);
                    // The sixth digit, typed or autofilled, sends it — no tap on Continue.
                    if (v.length === 6 && !isLoading) checkCode(v);
                  }}
                  accessibilityLabel={t.auth.codeLabel}
                />
                {message ? <Text style={styles.error}>{message}</Text> : null}
                <StepsButton
                  label={t.auth.verifyCode}
                  onPress={() => checkCode()}
                  loading={isLoading}
                  disabled={code.length < 6}
                  flat
                />
                <View style={[styles.codeLinks, isRTL && styles.rowReverse]}>
                  <Touchable
                    onPress={() => {
                      setFormError(null);
                      setStep("number");
                    }}
                    style={styles.smallLink}
                  >
                    <Text style={styles.linkAccent}>{t.auth.changeNumber}</Text>
                  </Touchable>
                  <Touchable
                    onPress={sendCode}
                    disabled={resendIn > 0 || isLoading}
                    style={styles.smallLink}
                  >
                    <Text style={resendIn > 0 ? styles.link : styles.linkAccent}>
                      {resendIn > 0 ? t.auth.resendIn(resendIn) : t.auth.resendCode}
                    </Text>
                  </Touchable>
                </View>
              </>
            )}
          </View>
        </AnimatedPanel>
        <View style={styles.languageBlock}>
          <LanguagePicker compact />
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  stack: {
    marginTop: 12,
    gap: 4,
  },
  languageBlock: { marginTop: 12, paddingHorizontal: 24 },
  link: {
    textAlign: "center",
    color: Colors.textLight,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  linkAccent: { color: Colors.sage, fontFamily: Fonts.bold, fontSize: 14 },
  rowReverse: { flexDirection: "row-reverse" },
  ltrField: { writingDirection: "ltr" },
  sentTo: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textLight, marginBottom: 4 },
  phoneDisplay: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.text,
    writingDirection: "ltr",
    marginBottom: 18,
  },
  codeLinks: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  smallLink: { minHeight: 44, justifyContent: "center" },
  error: {
    textAlign: "center",
    color: Colors.rose,
    fontFamily: Fonts.semiBold,
  },
});
