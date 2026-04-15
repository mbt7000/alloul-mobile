/**
 * ALLOUL&Q — Company AI Hub
 * ---------------------------
 * One-tap AI briefing for company owners. Fetches a unified insights bundle
 * from `/agent/company-insights`, then renders each section as an expandable
 * glass card. Privacy-first: the backend routes through Ollama when available
 * so company data never leaves the server.
 *
 * Sections: performance, tasks, meetings, deals, handovers.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View, ScrollView, Pressable, ActivityIndicator, RefreshControl,
  StyleSheet, Image, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import {
  getCompanyInsights,
  type CompanyInsightsResponse,
  type InsightSection,
} from "../../../api/ai.api";

type SectionMeta = {
  key: InsightSection;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const SECTIONS: SectionMeta[] = [
  { key: "performance", label: "الأداء العام",  subtitle: "صحة الشركة + توصيات",   icon: "pulse-outline",       color: "#2E8BFF" },
  { key: "tasks",       label: "المهام",        subtitle: "أولويات · blockers",    icon: "checkbox-outline",    color: "#00D4FF" },
  { key: "meetings",    label: "الاجتماعات",    subtitle: "تحضير + متابعة",        icon: "calendar-outline",    color: "#14E0A4" },
  { key: "deals",       label: "الصفقات",       subtitle: "خط الأنابيب + at-risk", icon: "trending-up-outline", color: "#FFB24D" },
  { key: "handovers",   label: "التسليمات",     subtitle: "مخاطر + إجراءات",       icon: "swap-horizontal",     color: "#FF4757" },
];

export default function CompanyAIHubScreen() {
  const { colors: c } = useAppTheme();
  const [data, setData] = useState<CompanyInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<InsightSection | null>("performance");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getCompanyInsights();
      setData(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "تعذّر الحصول على التحليل");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void load();
  };

  const handleShareAll = async () => {
    if (!data) return;
    const blocks: string[] = [`🧠 ملخص ${data.company_name} — ALLOUL&Q AI`];
    for (const s of SECTIONS) {
      const sec = data.sections[s.key];
      if (sec?.ok) blocks.push(`\n━━━ ${s.label} ━━━\n${sec.content}`);
    }
    await Share.share({ message: blocks.join("\n") });
  };

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="المساعد الذكي للشركة"
        leftButton="back"
        rightActions={
          data ? (
            <Pressable onPress={handleShareAll} style={styles.iconBtn}>
              <Ionicons name="share-outline" size={18} color={c.accentCyan} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card — agent icon + status */}
        <View style={[styles.heroCard, { borderColor: c.border }]}>
          <View style={styles.heroInner}>
            <View style={styles.agentIconWrap}>
              <View style={styles.agentIconHalo} />
              <Image
                source={require("../../../../assets/agent-icon.png")}
                style={styles.agentIcon}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="h3" weight="bold" style={{ textAlign: "right" }}>
                تحليل كامل للشركة
              </AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "right", marginTop: 4 }}>
                {data ? `آخر تحديث · ${new Date(data.generated_at).toLocaleTimeString("ar")}` : "يفكّر..."}
              </AppText>
              {data?.provider_tier ? (
                <View style={[styles.tierBadge, { borderColor: "#14E0A455", backgroundColor: "#14E0A418" }]}>
                  <Ionicons name="shield-checkmark" size={11} color="#14E0A4" />
                  <AppText variant="micro" weight="bold" style={{ color: "#14E0A4" }}>
                    خصوصية أولاً · {data.provider_tier}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={c.accentCyan} />
            <AppText variant="body" tone="muted" style={{ marginTop: 12 }}>
              جمع بيانات الشركة...
            </AppText>
            <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
              قد يستغرق ٢٠-٤٠ ثانية
            </AppText>
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { borderColor: "#FF4757" }]}>
            <Ionicons name="warning-outline" size={32} color="#FF4757" />
            <AppText variant="body" weight="bold" style={{ marginTop: 10 }}>تعذّر التحليل</AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {error}
            </AppText>
            <Pressable onPress={load} style={[styles.retryBtn, { borderColor: c.accentCyan }]}>
              <Ionicons name="refresh" size={14} color={c.accentCyan} />
              <AppText variant="caption" weight="bold" style={{ color: c.accentCyan }}>
                إعادة المحاولة
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {SECTIONS.map((meta) => {
              const sec = data?.sections[meta.key];
              const isExpanded = expanded === meta.key;
              const isOk = sec?.ok === true;
              const hasContent = sec !== undefined;

              return (
                <Pressable
                  key={meta.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setExpanded(isExpanded ? null : meta.key);
                  }}
                  style={[
                    styles.sectionCard,
                    {
                      borderColor: isExpanded ? `${meta.color}80` : c.border,
                      backgroundColor: isExpanded ? `${meta.color}0A` : c.cardElevated,
                    },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, {
                      backgroundColor: `${meta.color}22`,
                      borderColor: `${meta.color}55`,
                    }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" weight="bold" style={{ textAlign: "right" }}>
                        {meta.label}
                      </AppText>
                      <AppText variant="micro" tone="muted" style={{ textAlign: "right" }}>
                        {meta.subtitle}
                      </AppText>
                    </View>
                    {hasContent ? (
                      <View style={[styles.statusDot, { backgroundColor: isOk ? "#14E0A4" : "#FF4757" }]} />
                    ) : null}
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={c.textMuted}
                    />
                  </View>

                  {isExpanded ? (
                    <View style={styles.sectionBody}>
                      {!hasContent ? (
                        <AppText variant="caption" tone="muted" style={{ textAlign: "right" }}>
                          لا توجد بيانات كافية لهذا القسم
                        </AppText>
                      ) : isOk ? (
                        <AppText variant="caption" style={{ lineHeight: 22, textAlign: "right" }}>
                          {(sec as { ok: true; content: string }).content}
                        </AppText>
                      ) : (
                        <AppText variant="caption" style={{ color: "#FF4757", textAlign: "right" }}>
                          {(sec as { ok: false; error: string }).error}
                        </AppText>
                      )}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.12)", borderWidth: 1, borderColor: "rgba(0,212,255,0.4)",
  },
  heroCard: {
    borderRadius: 24, borderWidth: 1, padding: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  agentIconWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  agentIconHalo: {
    position: "absolute", width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: "rgba(0,212,255,0.45)",
    shadowColor: "#00D4FF", shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  agentIcon: { width: 54, height: 54, borderRadius: 27 },
  tierBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, marginTop: 6, alignSelf: "flex-end",
  },
  loadingBox: {
    alignItems: "center", paddingVertical: 50, gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  errorBox: {
    alignItems: "center", padding: 30,
    backgroundColor: "rgba(255,71,87,0.08)", borderRadius: 20, borderWidth: 1,
  },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, marginTop: 14,
  },
  sectionCard: {
    borderRadius: 20, borderWidth: 1, padding: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIcon: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sectionBody: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
  },
});
