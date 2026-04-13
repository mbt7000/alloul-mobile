import React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
import { radius } from "../../theme/tokens";

interface Props extends ViewProps {
  variant?: "default" | "elevated" | "outline";
  padding?: number;
}

export function GlassCard({ variant = "default", padding = 16, style, children, ...rest }: Props) {
  const baseStyle: ViewStyle = {
    borderRadius: radius.lg,
    padding,
    backgroundColor:
      variant === "elevated" ? "rgba(255,255,255,0.06)" :
      variant === "outline" ? "transparent" :
      "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor:
      variant === "elevated" ? "rgba(255,255,255,0.12)" :
      "rgba(255,255,255,0.08)",
  };
  return <View style={[baseStyle, style]} {...rest}>{children}</View>;
}
