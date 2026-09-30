import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { KeyboardAwareScrollView } from "../components/KeyboardAwareScrollView";
import { Screen } from "../components/Screen";
import { AuthTextField } from "../components/auth/AuthTextField";
import { StepsButton } from "../components/ui/StepsButton";
import { LanguagePicker } from "../components/ui/LanguagePicker";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Touchable } from "../components/ui/Touchable";
import { GOOGLE_SIGN_IN_ENABLED } from "../constants/flags";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAuth } from "../hooks/useAuth";
import { useReduceMotionSetting } from "../hooks/useReduceMotionSetting";
import { useTranslation } from "../i18n/useTranslation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

WebBrowser.maybeCompleteAuthSession();

/** Phone is the way in; email is kept for the admin and older accounts. */
type Mode = "phone" | "email";

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

/** Password field with a reveal toggle — typing a password blind is the
 *  single most common reason a correct password gets rejected. */
function PasswordField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AuthTextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Touchable
          onPress={() => setIsVisible((previous) => !previous)}
          style={styles.eye}
          accessibilityLabel={isVisible ? t.auth.hidePassword : t.auth.showPassword}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={Colors.textLight}
          />
        </Touchable>
      }
    />
  );
}

/** Seconds before "send the code again" unlocks — each resend is a paid SMS. */
const RESEND_SECONDS = 30;

/** "+972501234567" or "0501234567" → "050-123-4567", for the "we sent a code to" line. */
function displayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^972/, "0");
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : raw;
}

/** An Israeli mobile: 05x and seven more digits, however it was typed. */
function isMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, "").replace(/^972/, "0").replace(/^(?=5)/, "0");
  return /^05\d{8}$/.test(digits);
}

/**
 * Sign in — and, for a number we don't know yet, the start of sign-up.
 *
 * Families type their mobile number, get an SMS code, and type it back. A
 * known number is signed straight in; a new one carries on to the sign-up
 * screens with proof it was verified. No email, no password.
 *
 * Email and password stay behind a small link, for the admin account and the
 * handful of accounts created before phone sign-in.
 */
export default function AuthScreen() {
  const { t, locale, isRTL } = useTranslation();
  const [mode, setMode] = useState<Mode>("phone");
  const [phoneStep, setPhoneStep] = useState<"number" | "code">("number");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    isLoading,
    error,
    login,
    signInWithGoogle,
    startPhoneSignIn,
    verifyPhoneSignIn,
  } = useAuth();

  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) return;
    signInWithGoogle(idToken).then((ok) => {
      if (ok) router.replace("/(tabs)");
    });
  }, [response]);

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
      setPhoneStep("code");
      setResendIn(RESEND_SECONDS);
    }
  };

  const checkCode = async () => {
    if (code.replace(/\D/g, "").length < 6) return setFormError(t.auth.codeInvalid);
    setFormError(null);
    const result = await verifyPhoneSignIn(phone, code);
    if (result === "signedIn") {
      router.replace("/(tabs)");
    } else if (result) {
      router.push({ pathname: "/onboarding", params: { signupToken: result.signupToken } });
    }
  };

  const handleLogin = async () => {
    if (!EMAIL_REGEX.test(email.trim())) return setFormError(t.auth.emailInvalid);
    if (!password) return setFormError(t.auth.passwordTooShort);

    setFormError(null);
    const ok = await login({ email: email.trim(), password });
    if (ok) router.replace("/(tabs)");
  };

  const switchMode = (next: Mode) => {
    setFormError(null);
    setMode(next);
  };

  const message = formError ?? error;

  /**
   * Google sits below the form as an alternative, not as the headline choice.
   * Hidden by GOOGLE_SIGN_IN_ENABLED until the OAuth client carries the Play
   * App Signing SHA-1 — the request hook above still runs, because hooks
   * cannot be conditional, but nothing ever prompts.
   */
  const googleBlock = (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t.auth.or}</Text>
        <View style={styles.dividerLine} />
      </View>
      <StepsButton
        label={t.auth.continueWithGoogle}
        onPress={() => promptAsync()}
        variant="outline"
        flat
      />
    </>
  );

  const phonePanel =
    phoneStep === "number" ? (
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
          {t.auth.codeSentTo(displayPhone(phone))}
        </Text>
        <AuthTextField
          label={t.auth.codeLabel}
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\D/g, "").slice(0, 6));
            setFormError(null);
          }}
          keyboardType="number-pad"
          // iOS offers the code from the SMS above the keyboard.
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          style={styles.codeField}
          autoFocus
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <StepsButton label={t.auth.verifyCode} onPress={checkCode} loading={isLoading} flat />
        <View style={[styles.codeLinks, isRTL && styles.rowReverse]}>
          <Touchable
            onPress={() => {
              setFormError(null);
              setPhoneStep("number");
            }}
            style={styles.smallLink}
          >
            <Text style={styles.linkAccent}>{t.auth.changeNumber}</Text>
          </Touchable>
          <Touchable onPress={sendCode} disabled={resendIn > 0 || isLoading} style={styles.smallLink}>
            <Text style={resendIn > 0 ? styles.link : styles.linkAccent}>
              {resendIn > 0 ? t.auth.resendIn(resendIn) : t.auth.resendCode}
            </Text>
          </Touchable>
        </View>
      </>
    );

  const emailPanel = (
    <>
      <AuthTextField
        label={t.auth.emailPlaceholder}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setFormError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <PasswordField
        label={t.auth.passwordPlaceholder}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setFormError(null);
        }}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <StepsButton label={t.auth.signIn} onPress={handleLogin} loading={isLoading} flat />
      {GOOGLE_SIGN_IN_ENABLED ? googleBlock : null}
    </>
  );

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
            {mode === "phone" ? phonePanel : emailPanel}

            <Touchable
              onPress={() => switchMode(mode === "phone" ? "email" : "phone")}
              style={styles.linkButton}
            >
              <Text style={styles.link}>
                {mode === "phone" ? t.auth.useEmail : t.auth.usePhone}
              </Text>
            </Touchable>
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
  // A real 44x44 target, not just the 18pt glyph.
  eye: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginEnd: -10 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  childrenHint: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textLight,
    lineHeight: 18,
    marginTop: 2,
  },
  linkButton: { paddingVertical: 8, marginTop: 2 },
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
  codeField: { fontFamily: Fonts.bold, fontSize: 22, letterSpacing: 6, textAlign: "center" },
  sentTo: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textLight, marginBottom: 12 },
  codeLinks: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  smallLink: { minHeight: 44, justifyContent: "center" },
  error: {
    textAlign: "center",
    color: Colors.rose,
    fontFamily: Fonts.semiBold,
  },
});
