import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/AuthContext";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";

const STORY_ROWS = [
  { id: "1", nameKey: "workHome.storyTeam" as const, verified: true },
  { id: "2", nameKey: "workHome.storyAnnounce" as const, verified: true },
  { id: "3", nameKey: "workHome.storyHr" as const, verified: false },
  { id: "4", nameKey: "workHome.storySafety" as const, verified: true },
];

const QUICK_ACTIONS = [
  { key: "checkin", labelKey: "workHome.quickCheckIn" as const, icon: "time-outline" as const, tint: colors.accentCyan },
  { key: "id", labelKey: "workHome.quickDigitalId" as const, icon: "id-card-outline" as const, tint: colors.accentBlue },
  { key: "delegate", labelKey: "workHome.quickDelegations" as const, icon: "git-network-outline" as const, tint: colors.accentTeal },
  { key: "card", labelKey: "workHome.quickCard" as const, icon: "card-outline" as const, tint: colors.accentLime },
  { key: "perm", labelKey: "workHome.quickPermissions" as const, icon: "shield-checkmark-outline" as const, tint: colors.accentEmber },
  { key: "tasks", labelKey: "workHome.quickTasks" as const, icon: "checkbox-outline" as const, tint: colors.accentRose },
];

export default function WorkHomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const firstName = (user?.name || user?.username || "there").split(/\s+/)[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Ambient glow (Alloul — not a copy of any brand) */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{t("workHome.greeting", { name: firstName })}</Text>
          <Text style={styles.subGreeting}>{t("workHome.workspaceLine")}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
          <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => navigation.navigate("Approvals")}>
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Optional lightweight banner — seasonal / campaigns */}
        <GlassCard strength="strong" style={styles.banner}>
          <Text style={styles.bannerText}>{t("workHome.banner")}</Text>
        </GlassCard>

        {/* Stories row — maps to future Stories API */}
        <Text style={styles.sectionTitle}>{t("workHome.updates")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
          <TouchableOpacity style={styles.storyAdd} activeOpacity={0.85}>
            <View style={styles.storyAddInner}>
              <Ionicons name="add" size={22} color={colors.accentCyan} />
            </View>
            <Text style={styles.storyLabel}>{t("workHome.yourStory")}</Text>
          </TouchableOpacity>
          {STORY_ROWS.map((s) => (
            <TouchableOpacity key={s.id} style={styles.storyItem} activeOpacity={0.85}>
              <View style={styles.storyRing}>
                <View style={styles.storyAvatar}>
                  <Text style={styles.storyInitial}>{t(s.nameKey).slice(0, 1)}</Text>
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {t(s.nameKey)}
              </Text>
              {s.verified ? (
                <Ionicons name="checkmark-circle" size={12} color={colors.accentBlue} style={styles.storyBadge} />
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick grid — enterprise hub */}
        <Text style={styles.sectionTitle}>{t("workHome.quickActions")}</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} style={styles.gridCell} activeOpacity={0.88}>
              <View style={[styles.gridIconWrap, { borderColor: `${a.tint}55` }]}>
                <Ionicons name={a.icon} size={22} color={a.tint} />
              </View>
              <Text style={styles.gridLabel}>{t(a.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time summary — placeholder until attendance API */}
        <GlassCard style={styles.timeCard}>
          <View style={styles.timeHeader}>
            <Text style={styles.timeTitle}>{t("workHome.timeCheck")}</Text>
            <Text style={styles.timeMonth}>{t("workHome.thisMonth")}</Text>
          </View>
          <Text style={styles.timeBig}>—</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.timeMuted}>{t("workHome.timeIn")}</Text>
              <Text style={styles.timeVal}>—</Text>
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.timeMuted}>{t("workHome.duration")}</Text>
              <Text style={styles.timeVal}>—</Text>
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.timeMuted}>{t("workHome.balance")}</Text>
              <Text style={styles.timeVal}>—</Text>
            </View>
          </View>
        </GlassCard>

        {/* Inbox preview */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("Approvals")}>
          <GlassCard style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>{t("workHome.myInbox")}</Text>
              <Text style={styles.inboxCount}>3</Text>
            </View>
            <View style={styles.inboxRow}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.inboxRowText}>{t("workHome.humanCapital")}</Text>
              <Text style={styles.inboxRowNum}>1</Text>
            </View>
            <View style={styles.inboxRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.inboxRowText}>{t("workHome.leavesPermissions")}</Text>
              <Text style={styles.inboxRowNum}>2</Text>
            </View>
            <Text style={styles.inboxHint}>{t("workHome.openApprovals")}</Text>
          </GlassCard>
        </TouchableOpacity>

        {/* Shortcuts to deeper workspace */}
        <Text style={styles.sectionTitle}>{t("workHome.workspace")}</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Team")}
          activeOpacity={0.88}
        >
          <Ionicons name="people-outline" size={22} color={colors.accentCyan} />
          <Text style={styles.linkText}>{t("workHome.myTeam")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Projects")}
          activeOpacity={0.88}
        >
          <Ionicons name="folder-open-outline" size={22} color={colors.accentCyan} />
          <Text style={styles.linkText}>{t("workHome.projects")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.bottomWidgets}>
          <GlassCard style={styles.widget}>
            <Text style={styles.widgetTitle}>{t("workHome.directory")}</Text>
            <Text style={styles.widgetMeta}>{t("workHome.peopleOrg")}</Text>
          </GlassCard>
          <GlassCard style={styles.widget}>
            <Text style={styles.widgetTitle}>{t("workHome.insights")}</Text>
            <Text style={styles.widgetMeta}>{t("workHome.kpiSoon")}</Text>
          </GlassCard>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glowTop: {
    position: "absolute",
    top: -80,
    left: "15%",
    width: 280,
    height: 200,
    borderRadius: 120,
    backgroundColor: "rgba(76,111,255,0.12)",
    opacity: 0.9,
  },
  glowBlue: {
    position: "absolute",
    top: 40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(56,232,255,0.08)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  greeting: { color: colors.textPrimary, fontSize: 26, fontWeight: "800" },
  subGreeting: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
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
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentRose,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  banner: { padding: 12, marginBottom: 16 },
  bannerText: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  storiesRow: { flexDirection: "row", gap: 14, paddingBottom: 18 },
  storyAdd: { alignItems: "center", width: 64 },
  storyAddInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(56,232,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  storyItem: { alignItems: "center", width: 72 },
  storyRing: {
    padding: 2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(76,111,255,0.55)",
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgCardStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInitial: { color: colors.textPrimary, fontWeight: "800", fontSize: 18 },
  storyLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 6, maxWidth: 72, textAlign: "center" },
  storyBadge: { position: "absolute", bottom: 18, right: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  gridCell: {
    width: "31%",
    minWidth: "30%",
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
  },
  gridLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600", textAlign: "center" },
  timeCard: { padding: 16, marginBottom: 14 },
  timeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  timeTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  timeMonth: { color: colors.textMuted, fontSize: 12 },
  timeBig: { color: colors.accentCyan, fontSize: 28, fontWeight: "800", marginBottom: 12 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeCol: { flex: 1 },
  timeMuted: { color: colors.textMuted, fontSize: 11 },
  timeVal: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginTop: 4 },
  inboxCard: { padding: 14, marginBottom: 18 },
  inboxHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  inboxTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  inboxCount: { color: colors.accentBlue, fontWeight: "800" },
  inboxRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  inboxRowText: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  inboxRowNum: { color: colors.textPrimary, fontWeight: "700" },
  inboxHint: { color: colors.accentCyan, fontSize: 12, marginTop: 6, fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  linkText: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  bottomWidgets: { flexDirection: "row", gap: 10, marginTop: 8 },
  widget: { flex: 1, padding: 14 },
  widgetTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
  widgetMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
