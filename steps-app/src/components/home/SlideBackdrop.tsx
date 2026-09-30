import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";
import { CornerLeafDecoration } from "../ui/CornerLeafDecoration";

/**
 * The soft background behind a Home carousel slide.
 *
 * The sage & gold style has no bold cards: each slide is a pale tint fading
 * into the card colour, with a leaf branch in its end corner. It used to be a
 * saturated gradient with white text and a logo butterfly, which read as a
 * loud red block once the palette changed.
 *
 * Owns no data, so it looks finished even when the gallery is empty.
 */

/** One per slide: the highlight, the idea box and the mood check-in. */
export type SlideVariant = "highlight" | "idea" | "mood";

const GRADIENTS: Record<SlideVariant, readonly [string, string]> = {
  highlight: [Colors.primaryLight, Colors.card],
  idea: [Colors.bannerBg, Colors.card],
  mood: [Colors.accent2Light, Colors.card],
};

export function SlideBackdrop({
  variant,
  style,
  children,
}: {
  variant: SlideVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={style}>
      <LinearGradient
        colors={GRADIENTS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <CornerLeafDecoration corner="bottom-end" size="md" />
      {children}
    </View>
  );
}
