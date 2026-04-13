import React from "react";
import { Pressable, Text, ActivityIndicator, View, type PressableProps, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND } from "../../brand";
import { radius, typography } from "../../theme/tokens";

interface Props extends Omit<PressableProps, "style"> {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function GradientButton({
  label, variant = "primary", size = "md", loading, icon, fullWidth, style, disabled, ...rest
}: Props) {
  const h = size === "sm" ? 38 : size === "lg" ? 54 : 46;
  const px = size === "sm" ? 16 : size === "lg" ? 28 : 22;
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  const bg =
    variant === "primary" ? BRAND.colors.primary :
    variant === "secondary" ? "rgba(255,255,255,0.08)" :
    variant === "danger" ? BRAND.colors.error :
    "transparent";
  const color =
    variant === "primary" || variant === "danger" ? "#fff" :
    variant === "ghost" ? BRAND.colors.primary :
    "#fff";
  const borderColor = variant === "ghost" ? BRAND.colors.primary : "transparent";

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: h,
          paddingHorizontal: px,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? "100%" : undefined,
          ...(variant === "primary" ? {
            shadowColor: BRAND.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: pressed ? 0.2 : 0.4,
            shadowRadius: 12,
            elevation: 6,
          } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={fs + 3} color={color} />}
          <Text style={{ color, fontSize: fs, fontWeight: "700" }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
