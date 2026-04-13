import React from "react";
import { View, Text, type ViewStyle } from "react-native";
import { BRAND } from "../../brand";

type Tone = "primary" | "success" | "warning" | "error" | "info" | "neutral";

interface Props {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  style?: ViewStyle;
}

const TONE_MAP: Record<Tone, { bg: string; color: string }> = {
  primary: { bg: BRAND.colors.primary + "22", color: BRAND.colors.primary },
  success: { bg: BRAND.colors.success + "22", color: BRAND.colors.success },
  warning: { bg: BRAND.colors.warning + "22", color: BRAND.colors.warning },
  error:   { bg: BRAND.colors.error + "22",   color: BRAND.colors.error },
  info:    { bg: BRAND.colors.info + "22",    color: BRAND.colors.info },
  neutral: { bg: "rgba(255,255,255,0.08)",    color: "rgba(255,255,255,0.7)" },
};

export function Badge({ label, tone = "neutral", size = "md", style }: Props) {
  const { bg, color } = TONE_MAP[tone];
  const px = size === "sm" ? 6 : 10;
  const py = size === "sm" ? 2 : 4;
  const fs = size === "sm" ? 9 : 11;
  return (
    <View style={[{
      backgroundColor: bg,
      paddingHorizontal: px,
      paddingVertical: py,
      borderRadius: 999,
      alignSelf: "flex-start",
    }, style]}>
      <Text style={{ color, fontSize: fs, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
