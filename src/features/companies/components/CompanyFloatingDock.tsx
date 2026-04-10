import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { radius } from "../../../theme/radius";
import type { CompanySectionKey } from "./CompanySidebar";

// ── 5 most important sections directly accessible from the dock ────────────
// "المزيد" opens the sidebar to reach the remaining sections
const ITEMS: {
  key: CompanySectionKey | "more";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "more",     label: "المزيد",    icon: "menu-outline",          iconActive: "menu"              },
  { key: "tasks",    label: "المهام",    icon: "checkbox-outline",       iconActive: "checkbox"          },
  { key: "dashboard",label: "الرئيسية", icon: "grid-outline",           iconActive: "grid"              },
  { key: "projects", label: "المشاريع", icon: "folder-outline",         iconActive: "folder"            },
  { key: "chat",     label: "الدردشة",  icon: "chatbubble-outline",     iconActive: "chatbubble"        },
];

type Props = {
  activeSection: CompanySectionKey;
  onSelectSection: (key: CompanySectionKey) => void;
  onOpenSidebar: () => void;
  navigation: { navigate: (name: string) => void };
};

export default function CompanyFloatingDock({
  activeSection,
  onSelectSection,
  onOpenSidebar,
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  const { colors, mode } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          pointerEvents: "box-none",
        },
        pill: {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          backgroundColor: colors.floatingBarBg,
          borderRadius: radius.xxl,
          borderWidth: 1,
          borderColor: colors.floatingBarBorder,
          paddingHorizontal: 8,
          paddingTop: 10,
          paddingBottom: 8,
          marginHorizontal: 14,
          maxWidth: 440,
          width: "100%",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 24,
            },
            android: { elevation: 12 },
          }),
        },
        item: { flex: 1, alignItems: "center", minWidth: 50 },
        iconBox: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
        },
        iconBoxActive: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: colors.floatingActiveFill,
          borderWidth: 1,
          borderColor: colors.floatingActiveBorder,
        },
        label: {
          marginTop: 4,
          fontSize: 9,
          color: colors.textPrimary,
          textAlign: "center",
          fontWeight: "600",
        },
        labelActive: {
          color: colors.accentCyan,
        },
      }),
    [colors]
  );

  const activeIconColor = mode === "light" ? colors.white : colors.black;

  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.pill}>
        {ITEMS.map((item) => {
          const focused = item.key !== "more" && activeSection === item.key;

          const onPress = () => {
            if (item.key === "more") {
              onOpenSidebar();
              return;
            }
            if (item.key === "chat") {
              navigation.navigate("Chat");
              return;
            }
            onSelectSection(item.key);
          };

          const iconColor = focused ? activeIconColor : colors.textSecondary;

          return (
            <Pressable key={item.key} style={styles.item} onPress={onPress}>
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <Ionicons
                  name={focused ? item.iconActive : item.icon}
                  size={focused ? 22 : 20}
                  color={iconColor}
                />
              </View>
              <AppText
                variant="micro"
                style={[styles.label, focused && styles.labelActive]}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
