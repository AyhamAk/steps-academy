import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { Screen } from "../components/Screen";
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

/** Signing in is the default; registering is the deliberate detour. */
type Mode = "login" | "register";

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

function AuthInput({ trailing, ...props }: TextInputProps & { trailing?: React.ReactNode }) {
  const { isRTL } = useTranslation();
  const focusAnim = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        {...props}
        onFocus={(e) => {
          Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          props.onBlur?.(e);
        }}
        style={[styles.input, trailing ? styles.inputWithTrailing : null]}
      />
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      <Animated.View
        style={[
          styles.inputUnderline,
          {
            transform: [{ scaleX: focusAnim }],
            transformOrigin: isRTL ? "right" : "left",
          },
        ]}
      />
    </View>
  );
}

/** Password field with a reveal toggle — typing a password blind is the
 *  single most common reason a correct password gets rejected. */
function PasswordInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AuthInput
      placeholder={placeholder}
      placeholderTextColor={Colors.textLight}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Touchable
          onPress={() => setIsVisible((previous) => !previous)}
          hitSlop={10}
          accessibilityLabel={isVisible ? t.auth.hidePassword : t.auth.showPassword}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={Colors.textLight}
          />
        </Touchable>
      }
    />
  );
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const [mode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { isLoading, error, login, signInWithGoogle } = useAuth();

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

  const handleLogin = async () => {
    if (!EMAIL_REGEX.test(email.trim())) return setFormError(t.auth.emailInvalid);
    if (!password) return setFormError(t.auth.passwordTooShort);

    setFormError(null);
    const ok = await login({ email: email.trim(), password });
    if (ok) router.replace("/(tabs)");
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
      />
    </>
  );

  return (
    <Screen safeBottom>
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

          {mode === "login" ? (
            <AnimatedPanel>
              <View style={styles.stack}>
                <Text style={styles.heading}>{t.auth.signInHeading}</Text>

                <AuthInput
                  placeholder={t.auth.emailPlaceholder}
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setFormError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <PasswordInput
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setFormError(null);
                  }}
                />

                {message ? <Text style={styles.error}>{message}</Text> : null}

                <StepsButton label={t.auth.signIn} onPress={handleLogin} loading={isLoading} />

                {GOOGLE_SIGN_IN_ENABLED ? googleBlock : null}

                <Touchable onPress={() => router.push("/onboarding")} style={styles.linkButton}>
                  <Text style={styles.link}>
                    {t.auth.noAccount} <Text style={styles.linkAccent}>{t.invite.haveCode}</Text>
                  </Text>
                </Touchable>
              </View>
            </AnimatedPanel>
          ) : null}
          <View style={styles.languageBlock}>
            <LanguagePicker compact />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginTop: 20,
    gap: 12,
  },
  heading: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.bark,
    textAlign: "center",
    marginBottom: 4,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
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
  // Room for the reveal toggle so long passwords never run under it.
  inputWithTrailing: { paddingEnd: 48 },
  trailing: {
    position: "absolute",
    end: 14,
    height: "100%",
    justifyContent: "center",
  },
  inputUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.terracotta,
  },
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
  languageBlock: { marginTop: 28, paddingHorizontal: 24 },
  link: {
    textAlign: "center",
    color: Colors.textLight,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  linkAccent: { color: Colors.terracotta, fontFamily: Fonts.bold },
  error: {
    textAlign: "center",
    color: Colors.clay,
    fontFamily: Fonts.semiBold,
  },
});
