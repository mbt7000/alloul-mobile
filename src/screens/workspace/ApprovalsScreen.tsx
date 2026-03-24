import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabKey = "inbox" | "tracking";

const CATEGORIES = [
  { id: "hc", titleKey: "approvals.humanCapital" as const, count: 1, icon: "person-outline" as const },
  { id: "leave", titleKey: "approvals.leavesPermissions" as const, count: 2, icon: "calendar-outline" as const },
  { id: "proc", titleKey: "approvals.procurement" as const, count: 0, icon: "cart-outline" as const },
];

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("inbox");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    inbox: true,
    hc: false,
    leave: false,
    proc: false,
  });

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const inboxTotal = CATEGORIES.reduce((s, c) => s + c.count, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("approvals.title")}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
            <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "inbox" && styles.tabActive]}
          onPress={() => setTab("inbox")}
          activeOpacity={0.88}
        >
          <Text style={[styles.tabText, tab === "inbox" && styles.tabTextActive]}>
            {t("approvals.inbox", { count: inboxTotal })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "tracking" && styles.tabActive]}
          onPress={() => setTab("tracking")}
          activeOpacity={0.88}
        >
          <Text style={[styles.tabText, tab === "tracking" && styles.tabTextActive]}>{t("approvals.tracking")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === "inbox" ? (
          <GlassCard style={styles.card}>
            <TouchableOpacity
              style={styles.sectionHead}
              onPress={() => toggle("inbox")}
              activeOpacity={0.88}
            >
              <Text style={styles.sectionTitle}>{t("approvals.myInbox", { count: inboxTotal })}</Text>
              <Ionicons
                name={expanded.inbox ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {expanded.inbox
              ? CATEGORIES.map((c) => (
                  <View key={c.id}>
                    <TouchableOpacity
                      style={styles.catRow}
                      onPress={() => toggle(c.id)}
                      activeOpacity={0.88}
                    >
                      <View style={styles.catLeft}>
                        <View style={styles.catIcon}>
                          <Ionicons name={c.icon} size={18} color={colors.accentCyan} />
                        </View>
                        <Text style={styles.catTitle}>
                          {t(c.titleKey)}
                          {c.count > 0 ? ` (${c.count})` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name={expanded[c.id] ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                    {expanded[c.id] ? (
                      <View style={styles.catBody}>
                        <Text style={styles.placeholder}>
                          {c.count > 0 ? t("approvals.placeholderHasItems") : t("approvals.placeholderEmpty")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              : null}
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={styles.trackingTitle}>{t("approvals.trackingTitle")}</Text>
            <Text style={styles.placeholder}>{t("approvals.trackingBody")}</Text>
          </GlassCard>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: { paddingBottom: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accentBlue, marginBottom: -StyleSheet.hairlineWidth },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: colors.accentBlue },
  scroll: { padding: 16, paddingBottom: 100 },
  card: { padding: 4, overflow: "hidden" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(56,232,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "600", flex: 1 },
  catBody: { paddingHorizontal: 12, paddingBottom: 12, paddingLeft: 58 },
  placeholder: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  trackingTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8 },
});
