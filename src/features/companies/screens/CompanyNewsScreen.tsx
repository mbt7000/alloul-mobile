/**
 * CompanyNewsScreen
 * ─────────────────
 * Clean card-based feed for company announcements.
 * Uses existing /posts/ endpoint — no new APIs.
 */

import React, { useCallback, useState } from "react";
import { View, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getPosts, type ApiPost } from "../../../api";

export default function CompanyNewsScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getPosts(20, 0);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accentCyan} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>الأخبار والتحديثات</AppText>
            <AppText style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
              آخر منشورات الشركة
            </AppText>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={c.accentCyan} style={{ marginTop: 40 }} />
        ) : posts.length === 0 ? (
          <View style={{ alignItems: "center", padding: 60 }}>
            <Ionicons name="newspaper-outline" size={56} color="#333" />
            <AppText style={{ color: "#666", marginTop: 12 }}>لا توجد منشورات</AppText>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {posts.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => nav.navigate("PostDetail", { postId: post.id })}
                style={({ pressed }) => ({
                  backgroundColor: "#151515",
                  borderRadius: 20,
                  borderWidth: 1, borderColor: "#222",
                  overflow: "hidden",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {/* Image (if exists) */}
                {post.image_url && (
                  <Image
                    source={{ uri: post.image_url }}
                    style={{ width: "100%", height: 160 }}
                    resizeMode="cover"
                  />
                )}

                <View style={{ padding: 16 }}>
                  {/* Author row */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {post.author_avatar ? (
                      <Image
                        source={{ uri: post.author_avatar }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                      />
                    ) : (
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: "#1a1a1a",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "800" }}>
                          {(post.author_name || post.author_username || "U").slice(0, 1)}
                        </AppText>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: "#fff", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                        {post.author_name || post.author_username || "مستخدم"}
                      </AppText>
                      {post.created_at && (
                        <AppText style={{ color: "#666", fontSize: 10 }}>
                          {formatRelative(post.created_at)}
                        </AppText>
                      )}
                    </View>
                  </View>

                  {/* Content */}
                  {post.content && (
                    <AppText style={{ color: "#ddd", fontSize: 13, lineHeight: 20 }} numberOfLines={3}>
                      {post.content}
                    </AppText>
                  )}

                  {/* Meta row */}
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                    <MetaPill icon="heart-outline" value={post.likes_count ?? 0} />
                    <MetaPill icon="chatbubble-outline" value={post.comments_count ?? 0} />
                    <MetaPill icon="repeat-outline" value={post.reposts_count ?? 0} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <CompanyBottomBar />
    </Screen>
  );
}

function MetaPill({ icon, value }: { icon: any; value: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={13} color="#888" />
      <AppText style={{ color: "#888", fontSize: 11 }}>{value}</AppText>
    </View>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins}د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs}س`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} يوم`;
  } catch { return ""; }
}
