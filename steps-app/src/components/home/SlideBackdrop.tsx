import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Colors } from "../../constants/Colors";

/**
 * The layered background behind a Home carousel slide.
 *
 * Deliberately owns no data. Earlier attempts put the child's photo here, which
 * meant the slides fell back to a flat colour block whenever the gallery was
 * empty — which, in practice, was always. This looks finished on its own.
 *
 * Built from `View` + `expo-linear-gradient` + `Image` only: neither
 * react-native-svg nor expo-blur is installed, and adding a native module would
 * mean another full rebuild.
 */

type Blob = {
  size: number;
  color: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

type Variant = {
  gradient: readonly [string, string, string];
  butterfly: ImageSourcePropType;
  butterflySize: number;
  butterflyRotation: string;
  blobs: readonly [Blob, Blob];
};

/**
 * One entry per slide. The three share a structure but differ in hue, blob
 * placement and butterfly, so they read as a family rather than three copies.
 */
export type SlideVariant = "terracotta" | "forest" | "sky";

const VARIANTS: Record<SlideVariant, Variant> = {
  terracotta: {
    gradient: [Colors.terracottaDeep, Colors.terracotta, Colors.terracottaLight],
    butterfly: require("../../assets/logo-butterfly-1.png"),
    butterflySize: 78,
    butterflyRotation: "-16deg",
    blobs: [
      { size: 190, color: "rgba(255,255,255,0.13)", top: -86, right: -46 },
      { size: 120, color: "rgba(44,36,22,0.10)", bottom: -58, left: 28 },
    ],
  },
  forest: {
    gradient: [Colors.forestDeep, Colors.forest, Colors.forestLight],
    butterfly: require("../../assets/logo-butterfly-3.png"),
    butterflySize: 66,
    butterflyRotation: "12deg",
    blobs: [
      { size: 150, color: "rgba(255,255,255,0.14)", bottom: -74, right: -30 },
      { size: 104, color: "rgba(44,36,22,0.10)", top: -46, left: 46 },
    ],
  },
  sky: {
    gradient: [Colors.skyDeep, Colors.sky, Colors.skyLight],
    butterfly: require("../../assets/logo-butterfly-5.png"),
    butterflySize: 72,
    butterflyRotation: "-8deg",
    blobs: [
      { size: 168, color: "rgba(255,255,255,0.15)", top: -70, right: -54 },
      { size: 132, color: "rgba(44,36,22,0.09)", bottom: -70, left: -18 },
    ],
  },
};

export function SlideBackdrop({
  variant,
  isRTL,
  style,
  children,
}: {
  variant: SlideVariant;
  isRTL: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { gradient, butterfly, butterflySize, butterflyRotation, blobs } = VARIANTS[variant];

  return (
    <View style={style}>
      <LinearGradient
        colors={gradient}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Every decorative layer mirrors as one group under RTL, so the ornament
          always sits opposite the text rather than on top of it. The slide
          clips them: `carouselSlide` sets overflow hidden. */}
      <View style={[StyleSheet.absoluteFill, isRTL && styles.mirrored]} pointerEvents="none">
        {blobs.map((blob, index) => (
          <View
            key={index}
            style={[
              styles.blob,
              {
                width: blob.size,
                height: blob.size,
                borderRadius: blob.size / 2,
                backgroundColor: blob.color,
                top: blob.top,
                bottom: blob.bottom,
                left: blob.left,
                right: blob.right,
              },
            ]}
          />
        ))}
        <Image
          source={butterfly}
          style={[
            styles.butterfly,
            {
              width: butterflySize,
              height: butterflySize,
              transform: [{ rotate: butterflyRotation }],
            },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Keeps white text legible no matter where a light blob lands. */}
      <LinearGradient
        colors={["rgba(44,36,22,0)", "rgba(44,36,22,0.28)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  blob: {
    position: "absolute",
  },
  butterfly: {
    position: "absolute",
    right: 14,
    top: 14,
    opacity: 0.16,
  },
});
