import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import GlassCard from "../../../shared/components/GlassCard";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getDashboardStats,
  getProjects,
  getAllCompanyTasks,
  getCompanyMembers,
  type DashboardStats,
  type ProjectRow,
  type TaskRow,
} from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

function num(n?: number): string {
  return n == null || isNaN(n) ? "—" : String(n);
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { company } = useCompany();
  const styles = useThemedStyles((c) => ({
    body: { padding: 16, paddingBottom: 110, gap: 16 },
    sectionTitle: { marginBottom: 8 },
    kpiGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10 },
    kpiCard: {
      width: "47%" as any,
      padding: 14,
      gap: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
    },
    kpiIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 4,
    },
    actionRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10 },
    actionCard: {
      flex: 1,
      minWidth: 140,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    alertCard: { padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    progressBg: { height: 5, borderRadius: 3, backgroundColor: c.border, overflow: "hidden" as const, marginTop: 6 },
    progressFill: { height: "100%" as const, borderRadius: 3 },
    projectItem: { padding: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  }));

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, t] = await Promise.all([
        getDashboardStats().catch(() => null),
        getProjects(company?.id).catch(() => [] as ProjectRow[]),
        getAllCompanyTasks(company?.id).catch(() => [] as TaskRow[]),
      ]);
      setStats(s);
      setProjects(Array.isArray(p) ? p : []);
      setTasks(Array.isArray(t) ? t : []);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksTodo = tasks.filter((t) => t.status === "todo").length;
  const tasksInProgress = tasks.filter((t) => t.status === "in_progress").length;
  const highPriority = tasks.filter((t) => t.priority === "high" && t.status !== "done").length;
  const activeProjects = projects.filter((p) => p.status === "in_progress").length;

  const QUICK_ACTIONS = [
    { icon: "folder-open-outline" as const, label: "المشاريع",  screen: "Projects",    color: colors.accentBlue },
    { icon: "checkbox-outline" as const,    label: "المهام",     screen: "Tasks",        color: colors.accentCyan },
    { icon: "people-outline" as const,      label: "الفريق",     screen: "Team",         color: "#f5a623" },
    { icon: "chatbubbles-outline" as const, label: "المحادثات",  screen: "Chat",         color: "#00c9b1" },
    { icon: "trending-up-outline" as const, label: "العملاء",    screen: "CRM",          color: "#a855f7" },
    { icon: "swap-horizontal-outline" as const, label: "التسليم", screen: "Handover",    color: "#2dd36f" },
    { icon: "sparkles-outline" as const,    label: "الذكاء",     screen: "AiAssistant",  color: "#f472b6" },
    { icon: "bar-chart-outline" as const,   label: "التقارير",   screen: "Reports",      color: "#fb923c" },
  ];

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <AppText variant="micro" tone="muted" weight="bold">لوحة التحكم</AppText>
          <AppText variant="h2" weight="bold">{company?.name ?? "مساحة العمل"}</AppText>
        </View>
        {/* AI Analysis button */}
        <Pressable
          onPress={() => navigation.navigate("AiAssistant")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: `${colors.accentCyan}20`,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: `${colors.accentCyan}55`,
          }}
        >
          <Ionicons name="sparkles" size={15} color={colors.accentCyan} />
          <AppText style={{ color: colors.accentCyan, fontSize: 13, fontWeight: "700" }}>
            تحليل ذكي
          </AppText>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accentCyan} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        >
          {/* KPIs */}
          <View>
            <AppText variant="bodySm" weight="bold" tone="muted" style={styles.sectionTitle}>الأرقام الحية</AppText>
            <View style={styles.kpiGrid}>
              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Tasks")}>
                <View style={[styles.kpiIconBg, { backgroundColor: colors.accentCyan + "22" }]}>
                  <Ionicons name="checkbox-outline" size={18} color={colors.accentCyan} />
                </View>
                <AppText variant="h2" weight="bold">{tasksInProgress}</AppText>
                <AppText variant="micro" tone="muted">مهام جارية</AppText>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Tasks")}>
                <View style={[styles.kpiIconBg, { backgroundColor: "#f59e0b22" }]}>
                  <Ionicons name="time-outline" size={18} color="#f59e0b" />
                </View>
                <AppText variant="h2" weight="bold">{tasksTodo}</AppText>
                <AppText variant="micro" tone="muted">بانتظار التنفيذ</AppText>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Projects")}>
                <View style={[styles.kpiIconBg, { backgroundColor: colors.accentBlue + "22" }]}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.accentBlue} />
                </View>
                <AppText variant="h2" weight="bold">{activeProjects}</AppText>
                <AppText variant="micro" tone="muted">مشاريع نشطة</AppText>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Team")}>
                <View style={[styles.kpiIconBg, { backgroundColor: "#2dd36f22" }]}>
                  <Ionicons name="people-outline" size={18} color="#2dd36f" />
                </View>
                <AppText variant="h2" weight="bold">{num(stats?.team_size)}</AppText>
                <AppText variant="micro" tone="muted">أعضاء الفريق</AppText>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Tasks")}>
                <View style={[styles.kpiIconBg, { backgroundColor: "#ef444422" }]}>
                  <Ionicons name="warning-outline" size={18} color="#ef4444" />
                </View>
                <AppText variant="h2" weight="bold">{highPriority}</AppText>
                <AppText variant="micro" tone="muted">أولوية عالية</AppText>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => navigation.navigate("Tasks")}>
                <View style={[styles.kpiIconBg, { backgroundColor: colors.success + "22" }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={colors.success} />
                </View>
                <AppText variant="h2" weight="bold">{tasksDone}</AppText>
                <AppText variant="micro" tone="muted">مهام مكتملة</AppText>
              </Pressable>
            </View>
          </View>

          {/* Alerts */}
          {highPriority > 0 ? (
            <Pressable onPress={() => navigation.navigate("Tasks")}>
              <GlassCard style={styles.alertCard}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <AppText variant="bodySm" style={{ flex: 1 }}>
                  {`${highPriority} مهام بأولوية عالية تحتاج اهتمامك`}
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </GlassCard>
            </Pressable>
          ) : null}

          {/* Quick Actions */}
          <View>
            <AppText variant="bodySm" weight="bold" tone="muted" style={styles.sectionTitle}>وصول سريع</AppText>
            <View style={styles.actionRow}>
              {QUICK_ACTIONS.map((a) => (
                <Pressable key={a.screen} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: a.color + "22", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={a.icon} size={16} color={a.color} />
                  </View>
                  <AppText variant="bodySm" weight="bold">{a.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Projects */}
          {projects.length > 0 ? (
            <GlassCard style={{ overflow: "hidden", padding: 0 }}>
              <View style={{ padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <AppText variant="bodySm" weight="bold">المشاريع الأخيرة</AppText>
                <Pressable onPress={() => navigation.navigate("Projects")}>
                  <AppText variant="micro" tone="muted">عرض الكل</AppText>
                </Pressable>
              </View>
              {projects.slice(0, 4).map((p, i) => {
                const pct = p.tasks_count ? Math.round(((p.completed_count ?? 0) / p.tasks_count) * 100) : 0;
                return (
                  <Pressable key={p.id} onPress={() => navigation.navigate("Tasks", { projectId: p.id, projectName: p.name })}>
                    <View style={[styles.projectItem, i === Math.min(projects.length, 4) - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <AppText variant="bodySm" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{p.name}</AppText>
                        <AppText variant="micro" tone="muted">{pct}%</AppText>
                      </View>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? colors.success : colors.accentCyan }]} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </GlassCard>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
