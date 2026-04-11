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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { getProjects, createProject, updateProject, deleteProject, type ProjectRow } from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  planning:    { label: "تخطيط",  color: "#4c6fff", bg: "#4c6fff18" },
  in_progress: { label: "جاري",   color: "#00c9b1", bg: "#00c9b118" },
  completed:   { label: "مكتمل",  color: "#2dd36f", bg: "#2dd36f18" },
  archived:    { label: "مؤرشف",  color: "#6b7280", bg: "#6b728018" },
} as const;

const STATUS_CYCLE: Record<string, string> = {
  planning: "in_progress",
  in_progress: "completed",
  completed: "planning",
};

const TABS = [
  { key: "all",         label: "الكل" },
  { key: "planning",    label: "تخطيط" },
  { key: "in_progress", label: "جاري" },
  { key: "completed",   label: "مكتمل" },
];

function progress(p: ProjectRow) {
  if (!p.tasks_count) return 0;
  return Math.round(((p.completed_count ?? 0) / p.tasks_count) * 100);
}

function relativeTime(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "اليوم";
  if (d === 1) return "أمس";
  if (d < 7) return `منذ ${d} أيام`;
  return new Date(iso).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { company } = useCompany();

  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await getProjects(company?.id);
      setItems(Array.isArray(list) ? list : []);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [company?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createProject({ name: newName.trim(), description: newDesc.trim() || undefined, due_date: newDue.trim() || undefined });
      setItems((prev) => [p, ...prev]);
      setShowCreate(false); setNewName(""); setNewDesc(""); setNewDue("");
    } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر الإنشاء"); }
    finally { setCreating(false); }
  };

  const handleDelete = (item: ProjectRow) => {
    Alert.alert("حذف المشروع", `هل تريد حذف "${item.name}" وكل مهامه؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive",
        onPress: async () => {
          try {
            await deleteProject(item.id);
            setItems((p) => p.filter((x) => x.id !== item.id));
          } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر الحذف"); }
        },
      },
    ]);
  };

  const cycleStatus = async (item: ProjectRow) => {
    const next = STATUS_CYCLE[item.status] ?? "planning";
    try {
      const updated = await updateProject(item.id, { status: next });
      setItems((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    } catch { /* ignore */ }
  };

  const filtered = tab === "all" ? items : items.filter((p) => p.status === tab);

  const counts = {
    active: items.filter((p) => p.status === "in_progress").length,
    done: items.filter((p) => p.status === "completed").length,
    planning: items.filter((p) => p.status === "planning").length,
  };

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="المشاريع"
        leftButton="none"
        rightActions={
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#4c6fff" />
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
          <View style={[styles.statCard, { borderColor: "#00c9b140", backgroundColor: "#00c9b118" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#00c9b1" }}>{counts.active}</AppText>
            <AppText variant="micro" style={{ color: "#00c9b1", opacity: 0.85 }}>جاري</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#4c6fff40", backgroundColor: "#4c6fff18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#4c6fff" }}>{counts.planning}</AppText>
            <AppText variant="micro" style={{ color: "#4c6fff", opacity: 0.85 }}>تخطيط</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#2dd36f40", backgroundColor: "#2dd36f18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#2dd36f" }}>{counts.done}</AppText>
            <AppText variant="micro" style={{ color: "#2dd36f", opacity: 0.85 }}>مكتمل</AppText>
          </View>
        </View>

        {/* ── Tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)}
                style={[styles.chip, active && { borderColor: "#4c6fff", backgroundColor: "#4c6fff18" }]}>
                <AppText variant="micro" weight="bold" style={{ color: active ? "#4c6fff" : colors.textMuted }}>
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Project List ── */}
        {loading && !refreshing ? (
          <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
            <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>لا توجد مشاريع</AppText>
            <AppButton label="+ مشروع جديد" tone="primary" size="sm" style={{ marginTop: 12 }} onPress={() => setShowCreate(true)} />
          </View>
        ) : (
          filtered.map((item) => (
            <ProjectCard
              key={item.id}
              item={item}
              colors={colors}
              onViewTasks={() => navigation.navigate("Tasks", { projectId: item.id, projectName: item.name })}
              onCycleStatus={() => void cycleStatus(item)}
              onDelete={() => handleDelete(item)}
            />
          ))
        )}
      </ScrollView>

      {/* ── Create Modal ── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 16 }}>مشروع جديد</AppText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="اسم المشروع *"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={[styles.inputArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="وصف المشروع (اختياري)"
              placeholderTextColor={colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 10 }]}
              placeholder="تاريخ الانتهاء (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={newDue}
              onChangeText={setNewDue}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
              <AppButton
                label={creating ? "جاري الإنشاء…" : "إنشاء المشروع"} tone="primary" style={{ flex: 1 }}
                onPress={handleCreate} disabled={creating || !newName.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  item, colors, onViewTasks, onCycleStatus, onDelete,
}: {
  item: ProjectRow;
  colors: any;
  onViewTasks: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.planning;
  const pct = progress(item);

  return (
    <View style={[styles.projectCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + "50" }]}>
          <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
          <AppText variant="micro" weight="bold" style={{ color: cfg.color }}>{cfg.label}</AppText>
        </View>
        <AppText variant="micro" tone="muted">{relativeTime(item.created_at)}</AppText>
      </View>

      {/* Title */}
      <AppText variant="body" weight="bold" style={{ marginTop: 10, textAlign: "right" }}>
        {item.name}
      </AppText>

      {/* Description */}
      {item.description ? (
        <AppText variant="caption" tone="secondary" numberOfLines={2} style={{ marginTop: 4, textAlign: "right" }}>
          {item.description}
        </AppText>
      ) : null}

      {/* Progress */}
      <View style={{ marginTop: 12, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="micro" tone="muted">نسبة الإنجاز</AppText>
          <AppText variant="micro" weight="bold" style={{ color: pct === 100 ? "#2dd36f" : cfg.color }}>
            {pct}%
          </AppText>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, {
            width: `${pct}%` as any,
            backgroundColor: pct === 100 ? "#2dd36f" : cfg.color,
          }]} />
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="checkbox-outline" size={13} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">
            {item.completed_count ?? 0}/{item.tasks_count ?? 0} مهمة
          </AppText>
        </View>
        {item.due_date ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <AppText variant="micro" tone="muted">{item.due_date}</AppText>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionBtn, { borderColor: cfg.color + "60", backgroundColor: cfg.bg }]}
          onPress={onCycleStatus}
        >
          <Ionicons name="refresh-outline" size={15} color={cfg.color} />
          <AppText variant="micro" weight="bold" style={{ color: cfg.color }}>تحديث الحالة</AppText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" }]}
          onPress={onViewTasks}
        >
          <Ionicons name="list-outline" size={15} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">عرض المهام</AppText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { borderColor: "#ef444440", backgroundColor: "#ef444412", flex: 0, paddingHorizontal: 12 }]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </Pressable>
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
    backgroundColor: "#4c6fff18", borderWidth: 1, borderColor: "#4c6fff",
    alignItems: "center", justifyContent: "center",
  },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", marginTop: 16 },
  // Project Card
  projectCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
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
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginTop: 4 },
  inputArea: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, height: 90, textAlignVertical: "top", marginTop: 10,
  },
});
