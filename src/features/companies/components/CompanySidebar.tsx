import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import AppText from "../../../shared/ui/AppText";

export type CompanySectionKey =
  | "dashboard"
  | "teams"
  | "projects"
  | "tasks"
  | "meetings"
  | "handover"
  | "chat"
  | "knowledge"
  | "crm"
  | "reports"
  | "settings";

export type SidebarItem = {
  key: CompanySectionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const COMPANY_SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "dashboard", label: "الرئيسية",   icon: "grid-outline"                },
  { key: "teams",     label: "الفريق",      icon: "people-outline"              },
  { key: "projects",  label: "المشاريع",    icon: "folder-outline"              },
  { key: "tasks",     label: "المهام",       icon: "checkbox-outline"            },
  { key: "meetings",  label: "الاجتماعات",  icon: "videocam-outline"            },
  { key: "handover",  label: "التسليم",      icon: "swap-horizontal-outline"     },
  { key: "chat",      label: "الدردشة",      icon: "chatbubble-ellipses-outline" },
  { key: "knowledge", label: "المعرفة",      icon: "book-outline"                },
  { key: "crm",       label: "العملاء",      icon: "trending-up-outline"         },
  { key: "reports",   label: "التقارير",     icon: "bar-chart-outline"           },
  { key: "settings",  label: "الإعدادات",   icon: "settings-outline"            },
];

export default function CompanySidebar({
  activeKey,
  onSelect,
}: {
  activeKey: CompanySectionKey;
  onSelect: (key: CompanySectionKey) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: 6 },
        item: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
        },
        itemActive: {
          borderColor: colors.accentCyan,
          backgroundColor: colors.cardStrong,
        },
        itemPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
      }),
    [colors]
  );

  return (
    <View style={styles.wrap}>
      {COMPANY_SIDEBAR_ITEMS.map((it) => {
        const active = it.key === activeKey;
        return (
          <Pressable
            key={it.key}
            onPress={() => onSelect(it.key)}
            style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
          >
            <Ionicons name={it.icon} size={18} color={active ? colors.accentCyan : colors.textMuted} />
            <AppText
              variant={compact ? "micro" : "caption"}
              weight="bold"
              tone={active ? "primary" : "muted"}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
