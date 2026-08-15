import React from "react";
import { StyleSheet, View } from "react-native";

/** Every tinted icon square in the admin section, at one size. */
export default function IconTile({
  tint,
  children,
  size = 40,
}: {
  tint: string;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: tint + "22" }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
