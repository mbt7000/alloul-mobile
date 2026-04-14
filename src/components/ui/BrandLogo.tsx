/**
 * BrandLogo — ALLOUL&Q
 * Renders the real logo with subtle glow behind it.
 * Use on splash, auth screens, empty states.
 */
import React from "react";
import { View, Image, type ViewStyle } from "react-native";
import { BRAND } from "../../brand";

interface Props {
  size?: number;
  glow?: boolean;
  style?: ViewStyle;
}

export function BrandLogo({ size = 120, glow = true, style }: Props) {
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {glow && (
        <>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: size,
              backgroundColor: BRAND.colors.primary,
              opacity: 0.12,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: size,
              backgroundColor: BRAND.colors.secondary,
              opacity: 0.08,
            }}
          />
        </>
      )}
      <Image
        source={BRAND.logos.iconOnly}
        style={{ width: size, height: size, resizeMode: "contain" }}
      />
    </View>
  );
}
