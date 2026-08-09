import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { Screen } from "../components/Screen";
import { StepsButton } from "../components/ui/StepsButton";
import { StepsLogo } from "../components/ui/StepsLogo";
import { Colors } from "../constants/Colors";
import { Fonts } from "../constants/Fonts";
import { useAuth } from "../hooks/useAuth";
import { useReduceMotionSetting } from "../hooks/useReduceMotionSetting";
import { useTranslation } from "../i18n/useTranslation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

WebBrowser.maybeCompleteAuthSession();

type Mode = "welcome" | "register" | "login";

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

function AuthInput(props: TextInputProps) {
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
        style={styles.input}
      />
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

export default function AuthScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { isLoading, error, register, login, signInWithGoogle } = useAuth();

  const goToMode = (next: Mode) => {
    setFormError(null);
    setMode(next);
  };

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

  const handleRegister = async () => {
    if (!name.trim()) return setFormError(t.auth.nameRequired);
    if (!EMAIL_REGEX.test(email.trim())) return setFormError(t.auth.emailInvalid);
    if (password.length < MIN_PASSWORD_LENGTH) return setFormError(t.auth.passwordTooShort);

    setFormError(null);
    // Children are linked by the academy after signup — a parent typing a name
    // must not be what grants access to that child's photos.
    const ok = await register({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    if (ok) router.replace("/(tabs)");
  };

  const handleLogin = async () => {
    if (!EMAIL_REGEX.test(email.trim())) return setFormError(t.auth.emailInvalid);
    if (!password) return setFormError(t.auth.passwordTooShort);

    setFormError(null);
    const ok = await login({ email: email.trim(), password });
    if (ok) router.replace("/(tabs)");
  };

  return (
    <Screen>
      <View style={styles.content}>
        <StepsLogo />

        {mode === "welcome" && (
          <AnimatedPanel>
            <View style={styles.stack}>
              <StepsButton
                label={t.auth.continueWithGoogle}
                onPress={() => promptAsync()}
                variant="secondary"
              />
              <StepsButton
                label={t.auth.createAccount}
                onPress={() => goToMode("register")}
                shimmerOnMount
              />
              <Text style={styles.link} onPress={() => goToMode("login")}>
                {t.auth.alreadyHaveAccount}
              </Text>
            </View>
          </AnimatedPanel>
        )}

        {mode === "register" && (
          <AnimatedPanel>
            <View style={styles.stack}>
              <AuthInput
                placeholder={t.auth.namePlaceholder}
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setFormError(null);
                }}
              />
              <AuthInput
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setFormError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AuthInput
                placeholder={t.auth.passwordPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setFormError(null);
                }}
                secureTextEntry
              />

              <View style={styles.childrenBlock}>
                <Text style={styles.childrenHint}>{t.auth.childrenLinkedByAcademy}</Text>
              </View>

              {formError ?? error ? (
                <Text style={styles.error}>{formError ?? error}</Text>
              ) : null}
              <StepsButton
                label={t.auth.createAccountButton}
                onPress={handleRegister}
                loading={isLoading}
                shimmerOnMount
              />
              <Text style={styles.link} onPress={() => goToMode("welcome")}>
                {t.auth.back}
              </Text>
            </View>
          </AnimatedPanel>
        )}

        {mode === "login" && (
          <AnimatedPanel>
            <View style={styles.stack}>
              <AuthInput
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setFormError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AuthInput
                placeholder={t.auth.passwordPlaceholder}
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setFormError(null);
                }}
                secureTextEntry
              />
              {formError ?? error ? (
                <Text style={styles.error}>{formError ?? error}</Text>
              ) : null}
              <StepsButton
                label={t.auth.signIn}
                onPress={handleLogin}
                loading={isLoading}
                shimmerOnMount
              />
              <Text style={styles.link} onPress={() => goToMode("welcome")}>
                {t.auth.back}
              </Text>
            </View>
          </AnimatedPanel>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  stack: {
    marginTop: 24,
    gap: 12,
  },
  inputWrapper: {
    position: "relative",
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
  inputUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.terracotta,
  },
  childrenBlock: {
    marginTop: 4,
  },
  childrenLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.bark,
    marginBottom: 2,
  },
  childrenHint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 10,
  },
  link: {
    textAlign: "center",
    color: Colors.textLight,
    fontFamily: Fonts.semiBold,
    marginTop: 4,
  },
  error: {
    textAlign: "center",
    color: Colors.clay,
    fontFamily: Fonts.semiBold,
  },
});
