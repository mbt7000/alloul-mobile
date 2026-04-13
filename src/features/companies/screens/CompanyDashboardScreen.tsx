/**
 * CompanyDashboardScreen
 * ──────────────────────
 * Clean, reorganized company dashboard following the reference design.
 * Uses ONLY existing APIs and services — no new logic, no backend changes.
 *
 * Layout:
 *   1. Top Header (greeting + icons)
 *   2. Horizontal Quick Actions Row
 *   3. Main Services Grid (2 columns)
 *   4. Info Cards Section (stats)
 *   5. Recent Activity Section
 */

import React, { useCallback, useState } from "react";
import {
  View, ScrollView, Pressable, ActivityIndicator, Text,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getDashboardStats,
  getDashboardActivity,
  type DashboardStats,
  type DashboardActivityItem,
} from "../../../api";

// ─── Service definitions ─────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { key: "ai",       icon: "sparkles"          as const, label: "المساعد",    route: "AiAssistant",  color: "#a855f7" },
  { key: "meet",     icon: "videocam"          as const, label: "اجتماع",     route: "Meetings",     color: "#10b981" },
  { key: "task",     icon: "checkmark-circle"  as const, label: "مهمة",       route: "Tasks",        color: "#3b82f6" },
  { key: "chat",     icon: "chatbubbles"       as const, label: "دردشة",      route: "Chat",         color: "#0ea5e9" },
  { key: "handover", icon: "swap-horizontal"   as const, label: "تسليم",      route: "Handover",     color: "#f59e0b" },
  { key: "deals",    icon: "trending-up"       as const, label: "صفقات",      route: "CRM",          color: "#ef4444" },
];

const MAIN_SERVICES = [
  { key: "team",     icon: "people"           as const, label: "الفريق",      sub: "الموظفون والأدوار", route: "Team",       color: "#8b5cf6" },
  { key: "projects", icon: "folder"           as const, label: "المشاريع",    sub: "كل المشاريع",       route: "Projects",   color: "#06b6d4" },
  { key: "tasks",    icon: "list"             as const, label: "المهام",      sub: "قائمة كاملة",       route: "Tasks",      color: "#3b82f6" },
  { key: "meetings", icon: "calendar"         as const, label: "الاجتماعات",  sub: "الجدولة والفريق",   route: "Meetings",   color: "#10b981" },
  { key: "knowledge",icon: "book"             as const, label: "المعرفة",     sub: "الملفات والوثائق",  route: "Knowledge",  color: "#f59e0b" },
  { key: "reports",  icon: "bar-chart"        as const, label: "التقارير",    sub: "الأداء والتحليل",   route: "Reports",    color: "#ef4444" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyDashboardScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { user } = useAuth();
  const { company } = useCompany();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        getDashboardStats().catch(() => null),
        getDashboardActivity().catch(() => [] as DashboardActivityItem[]),
      ]);
      setStats(s);
      setActivity(Array.isArray(a) ? a.slice(0, 5) : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const firstName = (user?.name || user?.username || "").split(/\s+/)[0];

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accentCyan} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {/* ═══════════════ 1. TOP HEADER ═══════════════ */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="micro" tone="muted">مرحباً،</AppText>
            <AppText style={{ fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 }}>
              {firstName || "مستخدم"} 👋
            </AppText>
            {company?.name && (
              <AppText variant="micro" tone="muted" style={{ marginTop: 2 }}>{company.name}</AppText>
            )}
          </View>
          <Pressable
            onPress={() => nav.navigate("InternalSearch")}
            style={{
              width: 42, height: 42, borderRadius: 14,
              backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => nav.navigate("Notifications")}
            style={{
              width: 42, height: 42, borderRadius: 14,
              backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="notifications" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* ═══════════════ 2. HORIZONTAL QUICK ACTIONS ═══════════════ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          style={{ marginBottom: 22, marginHorizontal: -16, paddingHorizontal: 16 }}
        >
          {QUICK_ACTIONS.map((q) => (
            <Pressable
              key={q.key}
              onPress={() => nav.navigate(q.route)}
              style={{ alignItems: "center", width: 72 }}
            >
              <View style={{
                width: 58, height: 58, borderRadius: 18,
                backgroundColor: `${q.color}20`,
                borderWidth: 1, borderColor: `${q.color}44`,
                alignItems: "center", justifyContent: "center",
                marginBottom: 8,
              }}>
                <Ionicons name={q.icon} size={24} color={q.color} />
              </View>
              <AppText style={{ fontSize: 11, color: "#fff", fontWeight: "600", textAlign: "center" }}>
                {q.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        {/* ═══════════════ 3. MAIN SERVICES GRID (2 columns) ═══════════════ */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>الخدمات</AppText>
          <Pressable onPress={() => nav.navigate("Apps")}>
            <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "600" }}>عرض الكل</AppText>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {MAIN_SERVICES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => nav.navigate(s.route)}
              style={{
                width: "47%",
                backgroundColor: "#151515",
                borderRadius: 18,
                borderWidth: 1, borderColor: "#222",
                padding: 16,
                minHeight: 118,
                justifyContent: "space-between",
              }}
            >
              <View style={{
                width: 42, height: 42, borderRadius: 12,
                backgroundColor: `${s.color}22`,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <View>
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 12 }}>
                  {s.label}
                </AppText>
                <AppText style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                  {s.sub}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ═══════════════ 4. INFO / STATS CARDS ═══════════════ */}
        <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
          نظرة عامة
        </AppText>

        {loading && !stats ? (
          <View style={{ backgroundColor: "#151515", borderRadius: 18, padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={c.accentCyan} />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <StatCard
              icon="people"
              label="الفريق"
              value={String(stats?.team_size ?? 0)}
              color="#06b6d4"
            />
            <StatCard
              icon="checkmark-done"
              label="مهام معلقة"
              value={String(stats?.pending_tasks ?? 0)}
              color="#3b82f6"
            />
            <StatCard
              icon="swap-horizontal"
              label="تسليمات"
              value={String(stats?.total_handovers ?? 0)}
              color="#f59e0b"
            />
          </View>
        )}

        {/* ═══════════════ 5. RECENT ACTIVITY ═══════════════ */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>آخر النشاط</AppText>
          <Pressable onPress={() => nav.navigate("Reports")}>
            <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "600" }}>عرض الكل</AppText>
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#151515", borderRadius: 18, borderWidth: 1, borderColor: "#222", overflow: "hidden" }}>
          {activity.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Ionicons name="time-outline" size={32} color="#444" />
              <AppText style={{ color: "#666", marginTop: 8, fontSize: 13 }}>لا يوجد نشاط</AppText>
            </View>
          ) : (
            activity.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  padding: 14,
                  borderBottomWidth: idx < activity.length - 1 ? 1 : 0,
                  borderBottomColor: "#222",
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: "#06b6d422",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="pulse-outline" size={18} color={c.accentCyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                    {item.title || "نشاط"}
                  </AppText>
                  {item.time && (
                    <AppText style={{ color: "#888", fontSize: 11 }} numberOfLines={1}>
                      {item.time}
                    </AppText>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <CompanyBottomBar />
    </Screen>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: "#151515", borderRadius: 18,
      borderWidth: 1, borderColor: "#222", padding: 14,
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: `${color}22`,
        alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
