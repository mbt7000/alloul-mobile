import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { listConversations, type ConversationRow } from "../../../api";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

export default function DirectMessagesScreen() {
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listConversations();
      setConvs(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalUnread = convs.reduce((s, c) => s + c.unread_count, 0);

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText variant="bodySm" weight="bold">الرسائل</AppText>
            {totalUnread > 0 && (
              <View style={{ backgroundColor: c.accentBlue, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{totalUnread}</AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accentCyan} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80, gap: 12 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted">لا توجد محادثات بعد</AppText>
              <AppText variant="caption" tone="muted">ابحث عن مستخدم وأرسل رسالة</AppText>
            </View>
          }
          renderItem={({ item }) => {
            const initials = (item.other_user_name || "U").slice(0, 2).toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate("Conversation", { conversation: item })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                  backgroundColor: item.unread_count > 0 ? `${c.accentBlue}0A` : "transparent",
                }}
              >
                {item.other_user_avatar ? (
                  <Image source={{ uri: item.other_user_avatar }} style={{ width: 50, height: 50, borderRadius: 17 }} />
                ) : (
                  <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
                    <AppText variant="bodySm" weight="bold" style={{ color: c.accentCyan }}>{initials}</AppText>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <AppText variant="bodySm" weight={item.unread_count > 0 ? "bold" : "regular"} numberOfLines={1} style={{ flex: 1 }}>
                      {item.other_user_name || item.other_user_username || "User"}
                    </AppText>
                    <AppText variant="micro" tone="muted">{timeAgo(item.last_message_at)}</AppText>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                      {item.last_message || "@" + (item.other_user_username || "")}
                    </AppText>
                    {item.unread_count > 0 && (
                      <View style={{ backgroundColor: c.accentBlue, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{item.unread_count}</AppText>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}
