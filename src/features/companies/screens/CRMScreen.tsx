import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getDeals, createDeal, updateDeal, type DealRow } from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

// ─── Config ──────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "lead",        label: "عميل محتمل", color: "#6b7280", icon: "person-add-outline" as const },
  { key: "proposal",    label: "عرض سعر",    color: "#4c6fff", icon: "document-text-outline" as const },
  { key: "negotiation", label: "تفاوض",       color: "#f59e0b", icon: "swap-horizontal-outline" as const },
  { key: "won",         label: "مُغلق / فاز", color: "#2dd36f", icon: "trophy-outline" as const },
  { key: "lost",        label: "خسر",         color: "#ef4444", icon: "close-circle-outline" as const },
];

function stageOf(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function relTime(iso?: string | null) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "اليوم";
  if (d === 1) return "أمس";
  return `منذ ${d} يوم`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CRMScreen() {
  const { colors } = useAppTheme();

  const [items, setItems] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newStage, setNewStage] = useState("lead");

  const load = useCallback(async () => {
    try {
      const list = await getDeals();
      setItems(Array.isArray(list) ? list : []);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const handleCreate = async () => {
    if (!newCompany.trim() || !newValue.trim()) return;
    setCreating(true);
    try {
      const probMap: Record<string, number> = { lead: 20, proposal: 40, negotiation: 70, won: 100, lost: 0 };
      const deal = await createDeal({
        company: newCompany.trim(),
        value: parseFloat(newValue) || 0,
        stage: newStage,
        probability: probMap[newStage] ?? 20,
        contact: newContact.trim() || undefined,
      });
      setItems((p) => [deal, ...p]);
      setShowCreate(false); setNewCompany(""); setNewValue(""); setNewContact(""); setNewStage("lead");
    } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر الإنشاء"); }
    finally { setCreating(false); }
  };

  const advanceStage = async (deal: DealRow) => {
    const order = STAGES.map((s) => s.key);
    const idx = order.indexOf(deal.stage);
    const next = order[idx + 1];
    if (!next || next === "lost") return;
    const probMap: Record<string, number> = { proposal: 40, negotiation: 70, won: 100 };
    try {
      const updated = await updateDeal(deal.id, { stage: next, probability: probMap[next] ?? deal.probability });
      setItems((p) => p.map((d) => (d.id === updated.id ? updated : d)));
    } catch { /* ignore */ }
  };

  const display = stageFilter === "all" ? items : items.filter((d) => d.stage === stageFilter);

  const totalPipeline = items.filter((d) => d.stage !== "lost").reduce((s, d) => s + (d.value ?? 0), 0);
  const wonValue = items.filter((d) => d.stage === "won").reduce((s, d) => s + (d.value ?? 0), 0);
  const activeDeals = items.filter((d) => d.stage !== "won" && d.stage !== "lost").length;

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="إدارة العملاء"
        leftButton="none"
        rightActions={
          <Pressable onPress={() => setShowCreate(true)} style={[styles.addBtn, { borderColor: "#a855f7" }]}>
            <Ionicons name="add" size={20} color="#a855f7" />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "#a855f740", backgroundColor: "#a855f718" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#a855f7" }}>{activeDeals}</AppText>
            <AppText variant="micro" style={{ color: "#a855f7", opacity: 0.85 }}>نشطة</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#2dd36f40", backgroundColor: "#2dd36f18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#2dd36f" }}>{fmt(wonValue)}</AppText>
            <AppText variant="micro" style={{ color: "#2dd36f", opacity: 0.85 }}>مُغلقة SAR</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#00c9b140", backgroundColor: "#00c9b118" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#00c9b1" }}>{fmt(totalPipeline)}</AppText>
            <AppText variant="micro" style={{ color: "#00c9b1", opacity: 0.85 }}>إجمالي SAR</AppText>
          </View>
        </View>

        {/* ── Stage Filter ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ key: "all", label: "الكل", color: colors.textMuted }, ...STAGES].map((s) => {
            const active = stageFilter === s.key;
            const c = "color" in s ? s.color : colors.textMuted;
            return (
              <Pressable key={s.key} onPress={() => setStageFilter(s.key)}
                style={[styles.chip, active && { borderColor: c, backgroundColor: c + "18" }]}>
                <AppText variant="micro" weight="bold" style={{ color: active ? c : colors.textMuted }}>
                  {s.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Deal List ── */}
        {loading && !refreshing ? (
          <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 40 }} />
        ) : display.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
            <Ionicons name="trending-up-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>لا توجد صفقات</AppText>
            <AppButton label="+ صفقة جديدة" tone="primary" size="sm" style={{ marginTop: 12 }} onPress={() => setShowCreate(true)} />
          </View>
        ) : (
          display.map((deal) => (
            <DealCard key={deal.id} deal={deal} colors={colors} onAdvance={() => void advanceStage(deal)} />
          ))
        )}
      </ScrollView>

      {/* ── Create Modal ── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 16 }}>صفقة جديدة</AppText>

            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="اسم الشركة / العميل *" placeholderTextColor={colors.textMuted}
              value={newCompany} onChangeText={setNewCompany} autoFocus />

            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 10 }]}
              placeholder="القيمة (SAR) *" placeholderTextColor={colors.textMuted}
              value={newValue} onChangeText={setNewValue} keyboardType="numeric" />

            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 10 }]}
              placeholder="جهة التواصل (اختياري)" placeholderTextColor={colors.textMuted}
              value={newContact} onChangeText={setNewContact} />

            <AppText variant="caption" tone="muted" style={{ marginTop: 14, marginBottom: 8 }}>المرحلة</AppText>
            <View style={styles.stageGrid}>
              {STAGES.filter((s) => s.key !== "lost").map((s) => {
                const active = newStage === s.key;
                return (
                  <Pressable key={s.key} onPress={() => setNewStage(s.key)}
                    style={[styles.stageBtn, { borderColor: active ? s.color : colors.border, backgroundColor: active ? s.color + "18" : "transparent" }]}>
                    <Ionicons name={s.icon} size={16} color={active ? s.color : colors.textMuted} />
                    <AppText variant="micro" weight="bold" style={{ color: active ? s.color : colors.textMuted }}>
                      {s.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
              <AppButton label={creating ? "جاري…" : "إنشاء الصفقة"} tone="primary" style={{ flex: 1 }}
                onPress={handleCreate} disabled={creating || !newCompany.trim() || !newValue.trim()} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal, colors, onAdvance }: { deal: DealRow; colors: any; onAdvance: () => void }) {
  const st = stageOf(deal.stage);
  const canAdvance = deal.stage !== "won" && deal.stage !== "lost";

  return (
    <View style={[styles.dealCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: st.color + "18", borderColor: st.color + "50" }]}>
          <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
          <AppText variant="micro" weight="bold" style={{ color: st.color }}>{st.label}</AppText>
        </View>
        <View style={[styles.probBadge, { borderColor: colors.border }]}>
          <AppText variant="micro" weight="bold" style={{ color: colors.textMuted }}>{deal.probability}%</AppText>
        </View>
        <AppText variant="micro" tone="muted">{relTime(deal.created_at)}</AppText>
      </View>

      {/* Company + Value */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10 }}>
        <AppText variant="body" weight="bold" style={{ flex: 1, textAlign: "right" }}>{deal.company}</AppText>
        <AppText variant="body" weight="bold" style={{ color: st.color, marginLeft: 12 }}>
          {fmt(deal.value ?? 0)} SAR
        </AppText>
      </View>

      {/* Contact */}
      {deal.contact ? (
        <View style={[styles.metaItem, { marginTop: 6 }]}>
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">{deal.contact}</AppText>
        </View>
      ) : null}

      {/* Probability bar */}
      <View style={{ marginTop: 12, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="micro" tone="muted">احتمالية الإغلاق</AppText>
          <AppText variant="micro" weight="bold" style={{ color: st.color }}>{deal.probability}%</AppText>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${deal.probability}%` as any, backgroundColor: st.color }]} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {canAdvance ? (
          <Pressable style={[styles.actionBtn, { borderColor: st.color + "60", backgroundColor: st.color + "18" }]} onPress={onAdvance}>
            <Ionicons name="arrow-forward-circle-outline" size={15} color={st.color} />
            <AppText variant="micro" weight="bold" style={{ color: st.color }}>التالي</AppText>
          </Pressable>
        ) : null}
        <View style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)", opacity: 0.7 }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">التفاصيل</AppText>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: "center", gap: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)",
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#a855f718", borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", marginTop: 16 },
  dealCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  probBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16,
  },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  stageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stageBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
});
