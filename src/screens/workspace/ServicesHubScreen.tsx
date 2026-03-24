import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";
import { useCompany } from "../../lib/CompanyContext";
import { getCompanyStats, type CompanyStats } from "../../lib/api";

const FEATURED = [
  {
    id: "integrations",
    titleKey: "services.integrationsHub" as const,
    subtitleKey: "services.integrationsSub" as const,
    icon: "extension-puzzle-outline" as const,
  },
];

const GRID = [
  { id: "obj", labelKey: "objectives" as const, icon: "clipboard-outline" as const, dot: true },
  { id: "in", labelKey: "checkIn" as const, icon: "checkmark-circle-outline" as const, dot: false },
  { id: "leave", labelKey: "leave" as const, icon: "calendar-outline" as const, dot: false },
  { id: "perm", labelKey: "permission" as const, icon: "document-text-outline" as const, dot: false },
  { id: "letters", labelKey: "letters" as const, icon: "mail-outline" as const, dot: false },
  { id: "id", labelKey: "digitalId" as const, icon: "id-card-outline" as const, dot: true },
];

const LEAVE_KEYS = ["checkIn", "attendanceReport", "leave", "permission", "leaveHistory", "timeAttendance"] as const;

export default function ServicesHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { company, loading: companyLoading } = useCompany();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let on = true;
      setStatsLoading(true);
      void (async () => {
        try {
          const s = await getCompanyStats();
          if (on) setStats(s);
        } catch {
          if (on) setStats(null);
        } finally {
          if (on) setStatsLoading(false);
        }
      })();
      return () => {
        on = false;
      };
    }, [])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>{t("services.title")}</Text>
          <TouchableOpacity activeOpacity={0.85}>
            <Text style={styles.breadcrumb}>{t("services.directory")}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
          <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t("services.workspaceApi")}</Text>
        <GlassCard style={styles.workspaceCard}>
          {companyLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginVertical: 8 }} />
          ) : company ? (
            <>
              <Text style={styles.wsName}>{company.name}</Text>
              <Text style={styles.wsMeta}>i_code · {company.i_code}</Text>
              {statsLoading ? (
                <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 8 }} />
              ) : stats ? (
                <>
                  <Text style={styles.wsStats}>
                    {t("services.statsLine", { members: stats.total_members, depts: stats.total_departments })}
                  </Text>
                  {stats.subscription_status ? (
                    <Text style={styles.wsSub}>
                      {t("services.subStatus", { status: stats.subscription_status })}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.wsHint}>{t("services.statsUnavailable")}</Text>
              )}
            </>
          ) : (
            <Text style={styles.wsHint}>{t("services.noCompany")}</Text>
          )}
        </GlassCard>

        <Text style={styles.sectionLabel}>{t("services.featured")}</Text>
        {FEATURED.map((f) => (
          <TouchableOpacity key={f.id} activeOpacity={0.9}>
            <GlassCard strength="strong" style={styles.featured}>
              <View style={styles.featuredIcon}>
                <Ionicons name={f.icon} size={28} color={colors.accentBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle}>{t(f.titleKey)}</Text>
                <Text style={styles.featuredSub}>{t(f.subtitleKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </GlassCard>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>{t("services.alloulEServices")}</Text>
        <View style={styles.grid}>
          {GRID.map((g) => (
            <TouchableOpacity key={g.id} style={styles.gridCell} activeOpacity={0.88}>
              {g.dot ? <View style={styles.notifDot} /> : null}
              <View style={styles.gridIconWrap}>
                <Ionicons name={g.icon} size={24} color={colors.accentCyan} />
              </View>
              <Text style={styles.gridLabel}>{t(`services.${g.labelKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity activeOpacity={0.85}>
          <Text style={styles.showMore}>{t("services.showMore")}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t("services.leavesSection", { count: LEAVE_KEYS.length })}</Text>
        <GlassCard style={styles.listCard}>
          {LEAVE_KEYS.map((item, i) => (
            <TouchableOpacity
              key={item}
              style={[styles.listRow, i < LEAVE_KEYS.length - 1 && styles.listRowBorder]}
              activeOpacity={0.88}
            >
              <Text style={styles.listText}>{t(`services.${item}`)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "800" },
  breadcrumb: { color: colors.accentBlue, fontSize: 14, fontWeight: "600", marginTop: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  workspaceCard: { padding: 16, marginBottom: 8, gap: 6 },
  wsName: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  wsMeta: { color: colors.accentCyan, fontSize: 13, fontWeight: "600" },
  wsStats: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  wsSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  wsHint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 8,
    textTransform: "uppercase",
  },
  featured: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 20,
  },
  featuredIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(76,111,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  featuredSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCell: {
    width: "31%",
    minWidth: "30%",
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(56,232,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "600", textAlign: "center" },
  showMore: {
    color: colors.accentBlue,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  listCard: { paddingVertical: 4 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listText: { color: colors.textPrimary, fontSize: 15, fontWeight: "500" },
});
