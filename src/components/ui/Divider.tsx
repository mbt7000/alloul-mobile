import React from "react";
import { View, type ViewStyle } from "react-native";

interface Props {
  orientation?: "horizontal" | "vertical";
  style?: ViewStyle;
  spacing?: number;
}

export function Divider({ orientation = "horizontal", style, spacing = 0 }: Props) {
  const base: ViewStyle = orientation === "horizontal"
    ? { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: spacing }
    : { width: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: spacing };
  return <View style={[base, style]} />;
}
