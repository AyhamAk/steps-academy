import { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export function StepsLogo() {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 600 });
    floatY.value = withDelay(
      600,
      withRepeat(withTiming(-8, { duration: 1250 }), -1, true)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={require("../../assets/steps-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 220,
    height: 150,
    alignSelf: "center",
  },
});
