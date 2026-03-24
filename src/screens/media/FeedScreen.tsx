import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, RefreshControl,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/AuthContext";
import { getPosts, likePost, unlikePost, type ApiPost } from "../../lib/api";
import { colors } from "../../theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassCard from "../../components/glass/GlassCard";
import SectionHeader from "../../components/headers/SectionHeader";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function PostCard({ post, onLike }: { post: ApiPost; onLike: (id: number) => void }) {
  const initials = (post.author_name || "U").slice(0, 2).toUpperCase();
  return (
    <GlassCard style={styles.postCard}>
      <View style={styles.postHeader}>
        {post.author_avatar ? (
          <Image source={{ uri: post.author_avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.authorName}>{post.author_name || "User"}</Text>
            {post.author_verified && <Ionicons name="checkmark-circle" size={14} color={colors.accentBlue} />}
            <Text style={styles.timeText}>· {timeAgo(post.created_at)}</Text>
          </View>
          <Text style={styles.username}>@{post.author_username}</Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
          {post.comments_count > 0 && <Text style={styles.actionCount}>{post.comments_count}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
          <Ionicons name="repeat-outline" size={18} color={post.reposted_by_me ? colors.accentEmerald : colors.textMuted} />
          {(post.reposts_count || 0) > 0 && <Text style={styles.actionCount}>{post.reposts_count}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.liked_by_me ? "heart" : "heart-outline"}
            size={18}
            color={post.liked_by_me ? colors.accentRose : colors.textMuted}
          />
          {post.likes_count > 0 && (
            <Text style={[styles.actionCount, post.liked_by_me && { color: colors.accentRose }]}>{post.likes_count}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name={post.saved_by_me ? "bookmark" : "bookmark-outline"} size={18} color={post.saved_by_me ? colors.accent : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

export default function FeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const p = await getPosts(20, 0);
      setPosts(Array.isArray(p) ? p : []);
    } catch { setPosts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));
    try {
      if (post.liked_by_me) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : p
      ));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={{ color: colors.white, fontWeight: "800", fontSize: 12 }}>
                {(user?.name || "U").slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t("feed.title")}</Text>
          <Text style={styles.headerEyebrow}>{t("feed.eyebrow")}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} hitSlop={8}>
            <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            hitSlop={8}
            onPress={() => (navigation as any).navigate("MediaTabs", { screen: "Notifications" })}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard post={item} onLike={handleLike} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentCyan} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListHeaderComponent={
            <View style={styles.feedHeader}>
              <SectionHeader title={t("feed.curated")} actionLabel={t("feed.refine")} />
              <Text style={styles.feedSub}>{t("feed.sub")}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t("feed.noPosts")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerAvatar: { width: 32, height: 32, borderRadius: 10 },
  headerAvatarFallback: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
  headerEyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  feedHeader: { paddingTop: 14, paddingBottom: 12 },
  feedSub: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  postCard: { paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  postHeader: { flexDirection: "row", gap: 10, marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 12 },
  avatarFallback: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  authorName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  username: { color: colors.textMuted, fontSize: 13 },
  timeText: { color: colors.textMuted, fontSize: 13 },
  content: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  postImage: { width: "100%", height: 200, borderRadius: 14, marginBottom: 8, backgroundColor: colors.bgCard },
  actions: { flexDirection: "row", justifyContent: "space-between", paddingRight: 40 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  actionCount: { color: colors.textMuted, fontSize: 13 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { color: colors.textMuted, fontSize: 15, marginTop: 12 },
});
