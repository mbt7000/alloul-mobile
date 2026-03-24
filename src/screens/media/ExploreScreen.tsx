import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>  
      <View style={styles.header}>
        <Text style={styles.title}>{t("explore.title")}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>{t("common.soon")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#04070f" },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.08)" },
  title: { color: "#f1f5f9", fontSize: 20, fontWeight: "800" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { color: "#64748b", fontSize: 15 },
});
