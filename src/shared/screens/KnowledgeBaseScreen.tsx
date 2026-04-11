import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../layout/Screen";
import AppHeader from "../layout/AppHeader";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import {
  getKnowledgeItems,
  getKnowledgeStats,
  createKnowledgeItem,
  deleteKnowledgeItem,
  importHandoversToKnowledge,
  type KnowledgeItem,
  type KnowledgeStats,
} from "../../api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  process:  { label: "عملية",    icon: "⚙️",  color: "#60A5FA" },
  policy:   { label: "سياسة",    icon: "📋",  color: "#A78BFA" },
  person:   { label: "شخص",     icon: "👤",  color: "#34D399" },
  project:  { label: "مشروع",   icon: "🗂",  color: "#FB923C" },
  tool:     { label: "أداة",     icon: "🔧",  color: "#FBBF24" },
  task:     { label: "مهمة",    icon: "✅",  color: "#F472B6" },
  other:    { label: "أخرى",    icon: "📝",  color: "#94A3B8" },
};

const IMPORTANCE_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: "عالية",  color: "#F87171" },
  medium: { label: "متوسطة", color: "#FBBF24" },
  low:    { label: "منخفضة", color: "#94A3B8" },
};

const FILTERS = [
  { key: "all",     label: "الكل" },
  { key: "process", label: "عمليات" },
  { key: "policy",  label: "سياسات" },
  { key: "person",  label: "أشخاص" },
  { key: "project", label: "مشاريع" },
  { key: "tool",    label: "أدوات" },
];

const TYPE_OPTIONS = ["process", "policy", "person", "project", "tool", "task", "other"];
const IMPORTANCE_OPTIONS = ["high", "medium", "low"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 3,
        backgroundColor: `${cfg.color}20`,
        borderRadius: 12,
        alignSelf: "flex-start",
      }}
    >
      <AppText style={{ fontSize: 11 }}>{cfg.icon}</AppText>
      <AppText style={{ fontSize: 11, color: cfg.color, fontWeight: "700" }}>{cfg.label}</AppText>
    </View>
  );
}

function ImportanceDot({ importance }: { importance: string }) {
  const cfg = IMPORTANCE_CONFIG[importance] || IMPORTANCE_CONFIG.medium;
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function KnowledgeBaseScreen() {
  const { colors } = useAppTheme();
  const c = colors;

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("process");
  const [newDesc, setNewDesc] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newImportance, setNewImportance] = useState("medium");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        getKnowledgeItems({ company: true }),
        getKnowledgeStats(),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setStats(st);
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

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.type === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, filter, search]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await importHandoversToKnowledge();
      Alert.alert(
        "تم الاستيراد",
        `تم استيراد ${result.imported} عنصر جديد من ${result.total_handovers} تسليم.`
      );
      void load();
    } catch {
      Alert.alert("خطأ", "تعذّر استيراد التسليمات.");
    } finally {
      setImporting(false);
    }
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createKnowledgeItem({
        title: newTitle.trim(),
        type: newType,
        description: newDesc.trim() || undefined,
        tags: newTags.trim() || undefined,
        importance: newImportance,
      });
      setShowCreate(false);
      setNewTitle("");
      setNewType("process");
      setNewDesc("");
      setNewTags("");
      setNewImportance("medium");
      void load();
    } catch {
      Alert.alert("خطأ", "تعذّر إنشاء العنصر.");
    } finally {
      setCreating(false);
    }
  }, [newTitle, newType, newDesc, newTags, newImportance, load]);

  const handleDelete = useCallback(
    (item: KnowledgeItem) => {
      Alert.alert("حذف", `حذف "${item.title}"؟`, [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await deleteKnowledgeItem(item.id).catch(() => {});
            void load();
          },
        },
      ]);
    },
    [load]
  );

  if (loading && !refreshing) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <AppHeader title="قاعدة المعرفة" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      <AppHeader
        title="قاعدة المعرفة"
        rightActions={
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: `${c.accentCyan}22`,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.accentCyan,
            }}
          >
            <Ionicons name="add" size={16} color={c.accentCyan} />
            <AppText style={{ color: c.accentCyan, fontSize: 13, fontWeight: "700" }}>إضافة</AppText>
          </TouchableOpacity>
        }
      />

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
        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { value: stats?.total ?? 0, label: "إجمالي المعرفة", color: c.accentCyan },
            { value: stats?.high_importance ?? 0, label: "عالية الأهمية", color: "#F87171" },
            { value: stats?.by_type?.process ?? 0, label: "عمليات", color: "#60A5FA" },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: `${s.color}12`,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 10,
                alignItems: "center",
                gap: 4,
                borderWidth: 1,
                borderColor: `${s.color}30`,
              }}
            >
              <AppText style={{ fontSize: 20, fontWeight: "800", color: s.color }}>
                {s.value}
              </AppText>
              <AppText variant="micro" tone="muted" style={{ textAlign: "center" }}>
                {s.label}
              </AppText>
            </View>
          ))}
        </View>

        {/* Import from handovers button */}
        <TouchableOpacity
          onPress={handleImport}
          disabled={importing}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "rgba(167,139,250,0.12)",
            borderRadius: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "#A78BFA",
            marginBottom: 16,
          }}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#A78BFA" />
          ) : (
            <AppText style={{ fontSize: 16 }}>🔄</AppText>
          )}
          <AppText style={{ color: "#A78BFA", fontWeight: "700", fontSize: 14 }}>
            {importing ? "جارٍ الاستيراد..." : "استيراد من التسليمات"}
          </AppText>
        </TouchableOpacity>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 14,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={16} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث في قاعدة المعرفة..."
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: c.textPrimary, textAlign: "right" }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const cfg = f.key !== "all" ? TYPE_CONFIG[f.key] : null;
              const col = cfg?.color ?? c.accentCyan;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? col : "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: active ? col : c.border,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: active ? "#fff" : c.textMuted,
                    }}
                  >
                    {f.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Items list */}
        {filtered.length === 0 ? (
          <View
            style={{
              backgroundColor: c.bgCard,
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <AppText style={{ fontSize: 32 }}>🧠</AppText>
            <AppText variant="bodySm" weight="bold">لا توجد عناصر</AppText>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              أضف معرفة يدوياً أو استورد من التسليمات
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((item) => {
              const expanded = expandedId === item.id;
              const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
              const impCfg = IMPORTANCE_CONFIG[item.importance] || IMPORTANCE_CONFIG.medium;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setExpandedId(expanded ? null : item.id)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: c.bgCard,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: expanded ? typeCfg.color : c.border,
                    overflow: "hidden",
                  }}
                >
                  {/* Color accent bar */}
                  <View style={{ height: 3, backgroundColor: typeCfg.color }} />

                  <View style={{ padding: 14 }}>
                    {/* Top row */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: `${typeCfg.color}20`,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <AppText style={{ fontSize: 20 }}>{typeCfg.icon}</AppText>
                      </View>

                      <View style={{ flex: 1, gap: 5 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <ImportanceDot importance={item.importance} />
                          <AppText variant="bodySm" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                            {item.title}
                          </AppText>
                        </View>
                        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                          <TypeBadge type={item.type} />
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              backgroundColor: `${impCfg.color}20`,
                              borderRadius: 10,
                            }}
                          >
                            <AppText style={{ fontSize: 10, color: impCfg.color, fontWeight: "700" }}>
                              {impCfg.label}
                            </AppText>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded content */}
                    {expanded && (
                      <View style={{ marginTop: 12, gap: 10 }}>
                        {item.description ? (
                          <View
                            style={{
                              backgroundColor: "rgba(255,255,255,0.04)",
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            <AppText variant="caption" style={{ lineHeight: 20 }}>
                              {item.description}
                            </AppText>
                          </View>
                        ) : null}

                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          {item.department ? (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                backgroundColor: "rgba(255,255,255,0.06)",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 10,
                              }}
                            >
                              <Ionicons name="business-outline" size={12} color={c.textMuted} />
                              <AppText variant="micro" tone="muted">{item.department}</AppText>
                            </View>
                          ) : null}
                          {item.owner ? (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                backgroundColor: "rgba(255,255,255,0.06)",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 10,
                              }}
                            >
                              <Ionicons name="person-outline" size={12} color={c.textMuted} />
                              <AppText variant="micro" tone="muted">{item.owner}</AppText>
                            </View>
                          ) : null}
                        </View>

                        {item.tags.length > 0 && (
                          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                            {item.tags.map((tag) => (
                              <View
                                key={tag}
                                style={{
                                  backgroundColor: `${typeCfg.color}18`,
                                  paddingHorizontal: 9,
                                  paddingVertical: 3,
                                  borderRadius: 10,
                                }}
                              >
                                <AppText style={{ fontSize: 11, color: typeCfg.color }}>#{tag}</AppText>
                              </View>
                            ))}
                          </View>
                        )}

                        {item.date && (
                          <AppText variant="micro" tone="muted">
                            {new Date(item.date).toLocaleDateString("ar-SA")}
                          </AppText>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── Create Modal ─────────────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <View
            style={{
              backgroundColor: c.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 40,
              gap: 14,
            }}
          >
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: "center", marginBottom: 4 }} />

            <AppText variant="bodySm" weight="bold" style={{ textAlign: "right" }}>
              إضافة معرفة جديدة
            </AppText>

            {/* Title */}
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="العنوان *"
              placeholderTextColor={c.textMuted}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: c.textPrimary,
                fontSize: 14,
                borderWidth: 1,
                borderColor: c.border,
                textAlign: "right",
              }}
            />

            {/* Type picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {TYPE_OPTIONS.map((t) => {
                  const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.other;
                  const active = newType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setNewType(t)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 14,
                        backgroundColor: active ? cfg.color : "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: active ? cfg.color : c.border,
                      }}
                    >
                      <AppText style={{ fontSize: 13 }}>{cfg.icon}</AppText>
                      <AppText style={{ fontSize: 12, color: active ? "#fff" : c.textMuted, fontWeight: "700" }}>
                        {cfg.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Description */}
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="الوصف (اختياري)"
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: c.textPrimary,
                fontSize: 14,
                borderWidth: 1,
                borderColor: c.border,
                textAlign: "right",
                minHeight: 80,
              }}
            />

            {/* Tags */}
            <TextInput
              value={newTags}
              onChangeText={setNewTags}
              placeholder="وسوم مفصولة بفواصل (اختياري)"
              placeholderTextColor={c.textMuted}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: c.textPrimary,
                fontSize: 14,
                borderWidth: 1,
                borderColor: c.border,
                textAlign: "right",
              }}
            />

            {/* Importance */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {IMPORTANCE_OPTIONS.map((imp) => {
                const cfg = IMPORTANCE_CONFIG[imp];
                const active = newImportance === imp;
                return (
                  <TouchableOpacity
                    key={imp}
                    onPress={() => setNewImportance(imp)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: active ? `${cfg.color}22` : "rgba(255,255,255,0.06)",
                      borderWidth: 1.5,
                      borderColor: active ? cfg.color : c.border,
                      alignItems: "center",
                    }}
                  >
                    <AppText style={{ color: active ? cfg.color : c.textMuted, fontWeight: "700", fontSize: 13 }}>
                      {cfg.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  alignItems: "center",
                }}
              >
                <AppText style={{ color: c.textMuted, fontWeight: "700" }}>إلغاء</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!newTitle.trim() || creating}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: !newTitle.trim() ? "rgba(255,255,255,0.08)" : c.accentCyan,
                  alignItems: "center",
                }}
              >
                {creating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <AppText style={{ color: !newTitle.trim() ? c.textMuted : "#000", fontWeight: "800" }}>
                    حفظ
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
