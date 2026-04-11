import React, { useCallback, useState } from "react";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import {
  getChannels,
  createChannel,
  deleteChannel,
  type ChannelRow,
} from "../../../api";

// ─── Channel type config ──────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  general:      { icon: "#",  color: "#60A5FA", label: "عام" },
  announcement: { icon: "📢", color: "#F87171", label: "إعلانات" },
  department:   { icon: "🏢", color: "#A78BFA", label: "قسم" },
  project:      { icon: "🗂", color: "#FB923C", label: "مشروع" },
};

const TYPE_OPTIONS = ["general", "department", "project", "announcement"];

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const c = colors;

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("general");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getChannels();
      setChannels(Array.isArray(list) ? list : []);
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

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createChannel({ name: newName.trim(), type: newType, description: newDesc.trim() || undefined });
      setShowCreate(false);
      setNewName("");
      setNewType("general");
      setNewDesc("");
      void load();
    } catch (err: any) {
      Alert.alert("خطأ", err?.message || "تعذّر إنشاء القناة.");
    } finally {
      setCreating(false);
    }
  }, [newName, newType, newDesc, load]);

  const handleDeleteChannel = useCallback(
    (ch: ChannelRow) => {
      Alert.alert("حذف القناة", `حذف قناة "${ch.name}"؟ سيتم حذف جميع الرسائل.`, [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await deleteChannel(ch.id).catch(() => {});
            void load();
          },
        },
      ]);
    },
    [load]
  );

  const totalMessages = channels.reduce((s, ch) => s + (ch.message_count || 0), 0);

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">القنوات 💬</AppText>
          <AppText variant="micro" tone="muted">
            {channels.length} قناة · {totalMessages} رسالة
          </AppText>
        </View>
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
          <AppText style={{ color: c.accentCyan, fontSize: 13, fontWeight: "700" }}>قناة جديدة</AppText>
        </TouchableOpacity>
      </View>

      {/* Channel list */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.accentCyan} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={c.accentCyan}
            />
          }
        >
          {channels.length === 0 ? (
            <View
              style={{
                backgroundColor: c.bgCard,
                borderRadius: 16,
                padding: 28,
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <AppText style={{ fontSize: 40 }}>💬</AppText>
              <AppText variant="bodySm" weight="bold">لا توجد قنوات بعد</AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
                أنشئ قناة للبدء في التواصل مع فريقك
              </AppText>
            </View>
          ) : (
            channels.map((ch) => {
              const cfg = TYPE_CONFIG[ch.type] || TYPE_CONFIG.general;
              return (
                <TouchableOpacity
                  key={ch.id}
                  onPress={() => navigation.navigate("ChannelDetail", { channel: ch })}
                  activeOpacity={0.82}
                  style={{
                    backgroundColor: c.bgCard,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: c.border,
                    overflow: "hidden",
                  }}
                >
                  {/* Accent bar */}
                  <View style={{ height: 3, backgroundColor: cfg.color }} />

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                    }}
                  >
                    {/* Channel icon */}
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: `${cfg.color}20`,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {ch.type === "general" ? (
                        <AppText style={{ fontSize: 22, color: cfg.color, fontWeight: "900" }}>#</AppText>
                      ) : (
                        <AppText style={{ fontSize: 22 }}>{cfg.icon}</AppText>
                      )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <AppText variant="bodySm" weight="bold" style={{ flex: 1 }}>
                          {ch.name}
                        </AppText>
                        {/* Type badge */}
                        <View
                          style={{
                            backgroundColor: `${cfg.color}20`,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <AppText style={{ fontSize: 10, color: cfg.color, fontWeight: "700" }}>
                            {cfg.label}
                          </AppText>
                        </View>
                      </View>

                      {ch.last_message ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <AppText
                            variant="caption"
                            tone="muted"
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {ch.last_message}
                          </AppText>
                          <AppText variant="micro" tone="muted">
                            {formatRelativeTime(ch.last_message_at)}
                          </AppText>
                        </View>
                      ) : ch.description ? (
                        <AppText variant="caption" tone="muted" numberOfLines={1}>
                          {ch.description}
                        </AppText>
                      ) : (
                        <AppText variant="caption" tone="muted">لا توجد رسائل بعد</AppText>
                      )}
                    </View>

                    {/* Message count + arrow */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {ch.message_count > 0 && (
                        <View
                          style={{
                            backgroundColor: `${cfg.color}30`,
                            borderRadius: 10,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            minWidth: 24,
                            alignItems: "center",
                          }}
                        >
                          <AppText style={{ fontSize: 11, color: cfg.color, fontWeight: "800" }}>
                            {ch.message_count}
                          </AppText>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Divider + actions section */}
          {channels.length > 0 && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={{ height: 1, backgroundColor: c.border }} />
              <AppText variant="micro" tone="muted" style={{ textAlign: "center" }}>
                اضغط مطولاً على أي قناة لحذفها
              </AppText>

              {/* Manage channels */}
              {channels.map((ch) => (
                <TouchableOpacity
                  key={`del-${ch.id}`}
                  onLongPress={() => handleDeleteChannel(ch)}
                  style={{ display: "none" }} // invisible — just registers long press handler above
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── Create channel modal ─────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
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
            <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: "center", marginBottom: 4 }} />
            <AppText variant="bodySm" weight="bold" style={{ textAlign: "right" }}>
              إنشاء قناة جديدة
            </AppText>

            {/* Name */}
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="اسم القناة *"
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
            <View style={{ flexDirection: "row", gap: 8 }}>
              {TYPE_OPTIONS.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const active = newType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setNewType(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: active ? `${cfg.color}22` : "rgba(255,255,255,0.06)",
                      borderWidth: 1.5,
                      borderColor: active ? cfg.color : c.border,
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <AppText style={{ fontSize: 16 }}>
                      {t === "general" ? "#" : cfg.icon}
                    </AppText>
                    <AppText style={{ fontSize: 10, color: active ? cfg.color : c.textMuted, fontWeight: "700" }}>
                      {cfg.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="وصف القناة (اختياري)"
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
                disabled={!newName.trim() || creating}
                style={{
                  flex: 2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: !newName.trim() ? "rgba(255,255,255,0.08)" : c.accentCyan,
                  alignItems: "center",
                }}
              >
                {creating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <AppText style={{ color: !newName.trim() ? c.textMuted : "#000", fontWeight: "800" }}>
                    إنشاء
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
