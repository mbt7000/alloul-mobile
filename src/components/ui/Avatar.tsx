import React from "react";
import { View, Image, Text, type ViewStyle } from "react-native";
import { BRAND } from "../../brand";

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  status?: "online" | "busy" | "away" | "offline" | null;
  style?: ViewStyle;
}

const STATUS_COLOR: Record<string, string> = {
  online:  "#10b981",
  busy:    "#ef4444",
  away:    "#f59e0b",
  offline: "#6b7280",
};

export function Avatar({ uri, name, size = 48, status, style }: Props) {
  const initials = (name || "U").trim().slice(0, 2).toUpperCase();
  const dotSize = Math.max(8, size * 0.24);
  return (
    <View style={[{ width: size, height: size, position: "relative" }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: BRAND.colors.primary + "22",
          borderWidth: 1.5, borderColor: BRAND.colors.primary + "44",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: BRAND.colors.primary, fontSize: size * 0.36, fontWeight: "800" }}>
            {initials}
          </Text>
        </View>
      )}
      {status && (
        <View style={{
          position: "absolute",
          bottom: 0, right: 0,
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          backgroundColor: STATUS_COLOR[status],
          borderWidth: 2, borderColor: "#0b0b0b",
        }} />
      )}
    </View>
  );
}
