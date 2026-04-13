/**
 * CompanyBottomBar
 * ────────────────
 * Clean fixed bottom navigation for the new Company Dashboard.
 * Uses only existing routes — no new screens.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";

const ITEMS = [
  { key: "CompanyWorkspace", icon: "home"         as const, iconOutline: "home-outline"         as const },
  { key: "Chat",             icon: "chatbubble"   as const, iconOutline: "chatbubble-outline"   as const },
  { key: "Apps",             icon: "grid"         as const, iconOutline: "grid-outline"         as const },
  { key: "Meetings",         icon: "radio-button-on" as const, iconOutline: "radio-button-off" as const },
  { key: "Profile",          icon: "menu"         as const, iconOutline: "menu-outline"         as const },
];

export default function CompanyBottomBar() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const routeName = useNavigationState((state) => {
    const r = state?.routes?.[state.index];
    return r?.name ?? "";
  });

  return (
    <View style={[
      styles.wrap,
      { paddingBottom: Math.max(insets.bottom, 10) },
    ]}>
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const active = routeName === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => nav.navigate(item.key)}
              style={styles.item}
              hitSlop={8}
            >
              <Ionicons
                name={active ? item.icon : item.iconOutline}
                size={active ? 26 : 22}
                color={active ? "#0ea5e9" : "#888"}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 60,
    borderRadius: 22,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#222",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
