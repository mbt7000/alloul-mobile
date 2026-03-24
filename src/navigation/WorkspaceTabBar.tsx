import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors } from "../theme/colors";

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  WorkHome: { active: "home", inactive: "home-outline" },
  Approvals: { active: "mail", inactive: "mail-outline" },
  Services: { active: "apps", inactive: "apps-outline" },
  More: { active: "menu", inactive: "menu-outline" },
};

export default function WorkspaceTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const padBottom = Math.max(insets.bottom, 12);

  const routes = state.routes;

  return (
    <View style={[styles.wrap, { paddingBottom: padBottom }]}>
      <View style={styles.inner}>
        {routes.map((route, index) => {
          if (route.name === "MediaBridge") {
            const isFocused = state.index === index;
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                style={styles.centerBtn}
                onPress={() => {
                  const parent = navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined;
                  parent?.navigate("MediaTabs", { screen: "Feed" });
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.centerOrb, isFocused && styles.centerOrbActive]}>
                  <Ionicons name="diamond-outline" size={22} color={colors.accentCyan} />
                </View>
                <Text style={styles.centerLabel}>{t("tabs.media")}</Text>
              </TouchableOpacity>
            );
          }

          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];
          const iconName = icons
            ? isFocused
              ? icons.active
              : icons.inactive
            : "ellipse-outline";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const showInboxDot = route.name === "Approvals";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.85}
            >
              <View>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.accentBlue : colors.textMuted}
                />
                {showInboxDot ? <View style={styles.dot} /> : null}
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 12 },
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 8,
    minHeight: 56,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    maxWidth: 72,
    textAlign: "center",
  },
  labelActive: {
    color: colors.accentBlue,
  },
  dot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentCyan,
  },
  centerBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  centerOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,232,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.35)",
  },
  centerOrbActive: {
    backgroundColor: "rgba(76,111,255,0.15)",
    borderColor: colors.accentBlue,
  },
  centerLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
