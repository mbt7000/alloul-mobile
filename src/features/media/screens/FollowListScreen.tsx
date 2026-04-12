import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, Image, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getFollowers, getFollowing, followUser, unfollowUser, type FollowUser } from "../../../api";

interface RouteParams {
  userId: number;
  tab: "followers" | "following";
}

export default function FollowListScreen() {
  const nav = useNavigation<any>();
  const route = useRoute();
  const { userId, tab: initialTab } = route.params as RouteParams;
  const { colors } = useAppTheme();

  const [tab, setTab] = useState<"followers" | "following">(initialTab);
  const [list, setList] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "followers"
        ? await getFollowers(userId)
        : await getFollowing(userId);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  useEffect(() => { void load(); }, [load]);

  const toggleFollow = async (user: FollowUser) => {
    try {
      if (user.is_following) {
        await unfollowUser(user.id);
      } else {
        await followUser(user.id);
      }
      setList(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_following: !u.is_following } : u
      ));
    } catch {}
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(["followers", "following"] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, alignItems: "center", paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: tab === t ? colors.accentBlue : "transparent",
            }}
          >
            <AppText
              variant="bodySm"
              weight={tab === t ? "bold" : "regular"}
              style={{ color: tab === t ? colors.textPrimary : colors.textMuted }}
            >
              {t === "followers" ? "المتابعون" : "يتابع"}
            </AppText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <AppText variant="body" tone="muted" style={{ marginTop: 12 }}>
            {tab === "followers" ? "لا يوجد متابعون" : "لا يوجد متابَعون"}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: colors.bgCard, borderRadius: 16,
              borderWidth: 1, borderColor: colors.border, padding: 12,
            }}>
              <Pressable
                onPress={() => nav.push("UserProfile", { userId: item.id })}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: colors.accentBlue + "22",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <AppText style={{ color: colors.accentBlue, fontWeight: "800", fontSize: 16 }}>
                      {(item.name || item.username || "U").slice(0, 1).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" weight="bold" numberOfLines={1}>{item.name || item.username}</AppText>
                  <AppText variant="micro" tone="muted">@{item.username}</AppText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => void toggleFollow(item)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
                  backgroundColor: item.is_following ? "transparent" : colors.accentBlue,
                  borderWidth: 1,
                  borderColor: item.is_following ? colors.border : colors.accentBlue,
                }}
              >
                <AppText style={{
                  color: item.is_following ? colors.textPrimary : "#fff",
                  fontSize: 12, fontWeight: "700",
                }}>
                  {item.is_following ? "إلغاء" : "متابعة"}
                </AppText>
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
