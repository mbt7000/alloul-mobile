import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../layout/Screen";
import AppHeader from "../layout/AppHeader";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import {
  getDashboardStats,
  getDeals,
  getProjects,
  getAllCompanyTasks,
  getMeetings,
  getCompanyMembers,
  getHandovers,
  type DashboardStats,
  type DealRow,
  type ProjectRow,
  type TaskRow,
  type MeetingRow,
  type CompanyMemberRow,
  type HandoverRow,
} from "../../api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <AppText style={{ fontSize: 18 }}>{icon}</AppText>
      <AppText variant="bodySm" weight="bold" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

function StatCard({
  value,
  label,
  color,
  bg,
}: {
  value: string | number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: "center",
        gap: 4,
        minWidth: 70,
      }}
    >
      <AppText variant="title" weight="bold" style={{ color, fontSize: 22 }}>
        {value}
      </AppText>
      <AppText variant="micro" tone="muted" style={{ textAlign: "center" }}>
        {label}
      </AppText>
    </View>
  );
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const w = total > 0 ? Math.min(pct(value, total), 100) : 0;
  return (
    <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
      <View style={{ width: `${w}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

function StatusPill({
  label,
  color,
  bg,
  dot,
}: {
  label: string;
  color: string;
  bg: string;
  dot?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: bg,
        borderRadius: 20,
        alignSelf: "flex-start",
      }}
    >
      {dot ? (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
      ) : null}
      <AppText style={{ fontSize: 11, color, fontWeight: "700" }}>{label}</AppText>
    </View>
  );
}

function NavButton({
  label,
  route,
  color,
  navigation,
}: {
  label: string;
  route: string;
  color: string;
  navigation: any;
}) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(route)}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: "center",
      }}
    >
      <AppText style={{ color, fontSize: 13, fontWeight: "700" }}>{label}</AppText>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [handovers, setHandovers] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, t, d, m, mem, h] = await Promise.all([
        getDashboardStats().catch(() => null),
        getProjects().catch(() => [] as ProjectRow[]),
        getAllCompanyTasks().catch(() => [] as TaskRow[]),
        getDeals().catch(() => [] as DealRow[]),
        getMeetings().catch(() => [] as MeetingRow[]),
        getCompanyMembers().catch(() => [] as CompanyMemberRow[]),
        getHandovers().catch(() => [] as HandoverRow[]),
      ]);
      setStats(s);
      setProjects(Array.isArray(p) ? p : []);
      setTasks(Array.isArray(t) ? t : []);
      setDeals(Array.isArray(d) ? d : []);
      setMeetings(Array.isArray(m) ? m : []);
      setMembers(Array.isArray(mem) ? mem : []);
      setHandovers(Array.isArray(h) ? h : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  // ─── Derived metrics ───────────────────────────────────────────────────────

  const taskMetrics = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const high = tasks.filter((t) => t.priority === "high").length;
    return { total, done, inProgress, todo, high, completionRate: pct(done, total) };
  }, [tasks]);

  const projectMetrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const done = projects.filter((p) => p.status === "done" || p.status === "completed").length;
    const totalTasks = projects.reduce((s, p) => s + (p.tasks_count || 0), 0);
    const completedTasks = projects.reduce((s, p) => s + (p.completed_count || 0), 0);
    return { total, active, done, completionRate: pct(completedTasks, totalTasks) };
  }, [projects]);

  const dealMetrics = useMemo(() => {
    const active = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const won = deals.filter((d) => d.stage === "won");
    const pipeline = active.reduce((s, d) => s + (d.value || 0), 0);
    const wonValue = won.reduce((s, d) => s + (d.value || 0), 0);
    const avgProb = active.length
      ? Math.round(active.reduce((s, d) => s + (d.probability || 0), 0) / active.length)
      : 0;
    return { total: deals.length, active: active.length, won: won.length, pipeline, wonValue, avgProb };
  }, [deals]);

  const meetingMetrics = useMemo(() => {
    const upcoming = meetings.filter((m) => m.status === "scheduled").length;
    const done = meetings.filter((m) => m.status === "done").length;
    const total = meetings.length;
    return { total, upcoming, done };
  }, [meetings]);

  const handoverMetrics = useMemo(() => {
    const total = handovers.length;
    const accepted = handovers.filter((h) => h.status === "accepted").length;
    const inProgress = handovers.filter((h) => h.status === "in_progress").length;
    const avgScore = total
      ? Math.round(handovers.reduce((s, h) => s + (h.score || 0), 0) / total)
      : 0;
    return { total, accepted, inProgress, avgScore };
  }, [handovers]);

  function formatValue(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v);
  }

  const c = colors;
  const card = {
    backgroundColor: c.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
  };

  if (loading && !refreshing) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <AppHeader title="التقارير" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      <AppHeader title="التقارير" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={c.accentCyan}
          />
        }
      >
        {/* ─── Overview KPIs ─────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="📊" label="نظرة عامة" color={c.accentCyan} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <StatCard
              value={members.length}
              label="أعضاء الفريق"
              color="#60A5FA"
              bg="rgba(96,165,250,0.12)"
            />
            <StatCard
              value={projectMetrics.total}
              label="المشاريع"
              color="#A78BFA"
              bg="rgba(167,139,250,0.12)"
            />
            <StatCard
              value={taskMetrics.total}
              label="المهام"
              color="#34D399"
              bg="rgba(52,211,153,0.12)"
            />
            <StatCard
              value={dealMetrics.total}
              label="الصفقات"
              color="#FB923C"
              bg="rgba(251,146,60,0.12)"
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <StatCard
              value={`${stats?.knowledge_health_score ?? "—"}%`}
              label="صحة المعرفة"
              color={c.accentCyan}
              bg={`${c.accentCyan}18`}
            />
            <StatCard
              value={meetingMetrics.total}
              label="الاجتماعات"
              color="#F472B6"
              bg="rgba(244,114,182,0.12)"
            />
            <StatCard
              value={handoverMetrics.total}
              label="التسليمات"
              color="#FBBF24"
              bg="rgba(251,191,36,0.12)"
            />
          </View>
        </View>

        {/* ─── Tasks ─────────────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="✅" label="المهام" color="#34D399" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatCard value={taskMetrics.todo} label="للبدء" color="#94A3B8" bg="rgba(148,163,184,0.12)" />
            <StatCard value={taskMetrics.inProgress} label="جارية" color="#60A5FA" bg="rgba(96,165,250,0.12)" />
            <StatCard value={taskMetrics.done} label="منجزة" color="#34D399" bg="rgba(52,211,153,0.12)" />
            <StatCard value={taskMetrics.high} label="عالية الأهمية" color="#F87171" bg="rgba(248,113,113,0.12)" />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <AppText variant="caption" tone="muted">معدل الإنجاز</AppText>
              <AppText variant="caption" weight="bold" style={{ color: "#34D399" }}>
                {taskMetrics.completionRate}%
              </AppText>
            </View>
            <ProgressBar value={taskMetrics.done} total={taskMetrics.total} color="#34D399" />
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Tasks")}
            style={{
              marginTop: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(52,211,153,0.12)",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#34D399",
            }}
          >
            <AppText style={{ color: "#34D399", fontWeight: "700", fontSize: 13 }}>
              عرض كل المهام ←
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ─── Projects ──────────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="🗂" label="المشاريع" color="#A78BFA" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatCard value={projectMetrics.active} label="نشطة" color="#60A5FA" bg="rgba(96,165,250,0.12)" />
            <StatCard value={projectMetrics.done} label="منتهية" color="#34D399" bg="rgba(52,211,153,0.12)" />
            <StatCard
              value={`${projectMetrics.completionRate}%`}
              label="إنجاز المهام"
              color="#A78BFA"
              bg="rgba(167,139,250,0.12)"
            />
          </View>
          {projects.slice(0, 4).map((p) => {
            const total = p.tasks_count || 0;
            const done = p.completed_count || 0;
            const prog = pct(done, total);
            const statusColor =
              p.status === "active" ? "#60A5FA" : p.status === "done" ? "#34D399" : "#94A3B8";
            return (
              <View
                key={p.id}
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="bodySm" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </AppText>
                  <StatusPill
                    label={p.status}
                    color={statusColor}
                    bg={`${statusColor}22`}
                    dot={statusColor}
                  />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ProgressBar value={done} total={total} color={statusColor} />
                  </View>
                  <AppText variant="micro" tone="muted">{prog}%</AppText>
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            onPress={() => navigation.navigate("Projects")}
            style={{
              marginTop: 4,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(167,139,250,0.12)",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#A78BFA",
            }}
          >
            <AppText style={{ color: "#A78BFA", fontWeight: "700", fontSize: 13 }}>
              عرض كل المشاريع ←
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ─── CRM / Deals ───────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="💼" label="المبيعات والصفقات" color="#FB923C" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatCard
              value={dealMetrics.active}
              label="نشطة"
              color="#60A5FA"
              bg="rgba(96,165,250,0.12)"
            />
            <StatCard
              value={dealMetrics.won}
              label="محققة"
              color="#34D399"
              bg="rgba(52,211,153,0.12)"
            />
            <StatCard
              value={`${dealMetrics.avgProb}%`}
              label="متوسط الاحتمال"
              color="#FBBF24"
              bg="rgba(251,191,36,0.12)"
            />
          </View>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderRadius: 14,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" tone="muted">إجمالي خط الأنابيب</AppText>
              <AppText variant="bodySm" weight="bold" style={{ color: "#FB923C" }}>
                {formatValue(dealMetrics.pipeline)}
              </AppText>
            </View>
            <ProgressBar value={dealMetrics.wonValue} total={dealMetrics.pipeline + dealMetrics.wonValue} color="#34D399" />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" tone="muted">القيمة المحققة</AppText>
              <AppText variant="caption" weight="bold" style={{ color: "#34D399" }}>
                {formatValue(dealMetrics.wonValue)}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("CRM")}
            style={{
              marginTop: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(251,146,60,0.12)",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#FB923C",
            }}
          >
            <AppText style={{ color: "#FB923C", fontWeight: "700", fontSize: 13 }}>
              عرض لوحة المبيعات ←
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ─── Meetings ──────────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="📅" label="الاجتماعات" color="#F472B6" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatCard
              value={meetingMetrics.upcoming}
              label="قادمة"
              color="#60A5FA"
              bg="rgba(96,165,250,0.12)"
            />
            <StatCard
              value={meetingMetrics.done}
              label="منتهية"
              color="#34D399"
              bg="rgba(52,211,153,0.12)"
            />
            <StatCard
              value={meetingMetrics.total}
              label="الإجمالي"
              color="#F472B6"
              bg="rgba(244,114,182,0.12)"
            />
          </View>
          {meetings
            .filter((m) => m.status === "scheduled")
            .slice(0, 3)
            .map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: "rgba(244,114,182,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText style={{ fontSize: 20 }}>📅</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" weight="bold" numberOfLines={1}>
                    {m.title}
                  </AppText>
                  <AppText variant="micro" tone="muted">
                    {m.meeting_date}{m.meeting_time ? ` · ${m.meeting_time}` : ""}
                  </AppText>
                </View>
                <StatusPill label="قادم" color="#60A5FA" bg="rgba(96,165,250,0.15)" dot="#60A5FA" />
              </View>
            ))}
          <TouchableOpacity
            onPress={() => navigation.navigate("Meetings")}
            style={{
              marginTop: 4,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(244,114,182,0.12)",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#F472B6",
            }}
          >
            <AppText style={{ color: "#F472B6", fontWeight: "700", fontSize: 13 }}>
              عرض كل الاجتماعات ←
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ─── Handovers ─────────────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="🔄" label="التسليمات" color="#FBBF24" />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatCard
              value={handoverMetrics.inProgress}
              label="جارية"
              color="#60A5FA"
              bg="rgba(96,165,250,0.12)"
            />
            <StatCard
              value={handoverMetrics.accepted}
              label="مقبولة"
              color="#34D399"
              bg="rgba(52,211,153,0.12)"
            />
            <StatCard
              value={`${handoverMetrics.avgScore}%`}
              label="متوسط الدرجة"
              color="#FBBF24"
              bg="rgba(251,191,36,0.12)"
            />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <AppText variant="caption" tone="muted">معدل الإنجاز</AppText>
              <AppText variant="caption" weight="bold" style={{ color: "#FBBF24" }}>
                {pct(handoverMetrics.accepted, handoverMetrics.total)}%
              </AppText>
            </View>
            <ProgressBar value={handoverMetrics.accepted} total={handoverMetrics.total} color="#FBBF24" />
          </View>
        </View>

        {/* ─── Quick Navigation ──────────────────────────────────────── */}
        <View style={card}>
          <SectionTitle icon="🚀" label="الوصول السريع" color={c.accentCyan} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <NavButton label="لوحة القيادة" route="Dashboard" color={c.accentCyan} navigation={navigation} />
            <NavButton label="المهام" route="Tasks" color="#34D399" navigation={navigation} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <NavButton label="المشاريع" route="Projects" color="#A78BFA" navigation={navigation} />
            <NavButton label="الصفقات" route="CRM" color="#FB923C" navigation={navigation} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <NavButton label="الاجتماعات" route="Meetings" color="#F472B6" navigation={navigation} />
            <NavButton label="الفريق" route="Team" color="#60A5FA" navigation={navigation} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
