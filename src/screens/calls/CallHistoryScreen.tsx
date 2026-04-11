import React, { useCallback, useEffect, useState } from "react";
import {
  View, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../theme/ThemeContext";
import Screen from "../../shared/layout/Screen";
import AppText from "../../shared/ui/AppText";
import { getCallHistory, type CallLog } from "../../api/calls.api";
import { useCallContext } from "../../context/CallContext";

function formatDuration(secs?: number): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}ث`;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

const STATUS_CONFIG = {
  accepted:  { icon: "call-outline" as const,    label: "مكتملة" },
  ended:     { icon: "call-outline" as const,    label: "مكتملة" },
  rejected:  { icon: "call-outline" as const,    label: "مرفوضة" },
  missed:    { icon: "call-outline" as const,    label: "فائتة" },
  ringing:   { icon: "call-outline" as const,    label: "لم يرد" },
};

export default function CallHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { startCall } = useCallContext();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getCallHistory();
      setLogs(data);
    } catch { setLogs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <AppText variant="bodySm" weight="bold" style={{ flex: 1 }}>سجل المكالمات</AppText>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Ionicons name="call-outline" size={48} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted">لا توجد مكالمات سابقة</AppText>
            </View>
          }
          renderItem={({ item }) => {
            const isMissed = item.status === "rejected" || item.status === "missed" || item.status === "ringing";
            const iconColor = item.is_outgoing ? c.accentBlue : isMissed ? "#ef4444" : "#10b981";
            const directionIcon = item.is_outgoing ? "arrow-up-circle-outline" : (isMissed ? "arrow-down-circle-outline" : "arrow-down-circle-outline");
            const callTypeIcon = item.call_type === "video" ? "videocam-outline" : "call-outline";
            const initials = (item.other_user_name || "U").slice(0, 2).toUpperCase();

            return (
              <View style={{ backgroundColor: c.bgCard, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBlue + "22", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {item.other_user_avatar ? (
                    <Image source={{ uri: item.other_user_avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <AppText style={{ color: c.accentBlue, fontSize: 16, fontWeight: "800" }}>{initials}</AppText>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" weight="bold">{item.other_user_name}</AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <Ionicons name={directionIcon} size={13} color={iconColor} />
                    <Ionicons name={callTypeIcon} size={13} color={c.textMuted} />
                    <AppText variant="micro" tone="muted">
                      {isMissed ? "فائتة" : formatDuration(item.duration)} • {timeAgo(item.started_at)}
                    </AppText>
                  </View>
                </View>

                {/* Call back button */}
                <TouchableOpacity
                  onPress={() => void startCall(item.other_user_id, item.other_user_name, item.other_user_avatar, item.call_type)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentBlue + "22", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.accentBlue + "44" }}
                >
                  <Ionicons name={callTypeIcon} size={18} color={c.accentBlue} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
