import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientButton } from "./GradientButton";

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "document-outline", title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={{ alignItems: "center", padding: 40 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <Ionicons name={icon} size={32} color="rgba(255,255,255,0.4)" />
      </View>
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={{ marginTop: 20 }}>
          <GradientButton label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
