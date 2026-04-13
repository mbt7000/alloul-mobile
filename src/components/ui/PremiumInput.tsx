import React, { useState } from "react";
import { View, TextInput, Text, Pressable, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND } from "../../brand";
import { radius } from "../../theme/tokens";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
  helper?: string;
}

export function PremiumInput({
  label, error, icon, secureToggle, helper,
  secureTextEntry, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  const borderColor = error
    ? BRAND.colors.error
    : focused
    ? BRAND.colors.primary
    : "rgba(255,255,255,0.12)";

  return (
    <View>
      {label && (
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      )}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: "rgba(255,255,255,0.03)",
        paddingHorizontal: 14,
        height: 50,
      }}>
        {icon && (
          <Ionicons name={icon} size={18} color={focused ? BRAND.colors.primary : "rgba(255,255,255,0.4)"} style={{ marginLeft: 10 }} />
        )}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={{
            flex: 1,
            color: "#fff",
            fontSize: 15,
            paddingVertical: 0,
          }}
        />
        {secureToggle && secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        )}
      </View>
      {(error || helper) && (
        <Text style={{ color: error ? BRAND.colors.error : "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 6 }}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}
