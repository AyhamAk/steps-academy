import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";

type ScreenFadeInProps = PropsWithChildren<{ style?: ViewStyle }>;

export function ScreenFadeIn({ children, style }: ScreenFadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const config = { duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true };
    Animated.timing(opacity, { toValue: 1, ...config }).start();
    Animated.timing(translateY, { toValue: 0, ...config }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
