import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../state/auth/AuthContext";
import { getPosts, getFollowingPosts, likePost, unlikePost, repostPost, unrepostPost, savePost, unsavePost, type ApiPost } from "../../../api";
import { formatApiError } from "../../../shared/utils/apiErrors";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import GlassCard from "../../../shared/components/GlassCard";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import UnifiedSearchField from "../../../shared/components/UnifiedSearchField";
import { addRecentSearch } from "../../../storage/recentSearches";
import MediaPostRow from "../components/MediaPostRow";
import { getStories, groupStoriesByUser, type StoryGroup } from "../../../api/stories.api";

const STORY_COLORS = ["#38e8ff", "#a855f7", "#f472b6", "#fb923c", "#2dd36f", "#3b82f6", "#f59e0b"];

function StoriesBar({ onAddStory, onViewStory, currentUserId }: {
  onAddStory?: () => void;
  onViewStory?: (groups: StoryGroup[], index: number) => void;
  currentUserId: number;
}) {
  const { colors } = useAppTheme();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    try {
      const stories = await getStories();
      setGroups(groupStoriesByUser(stories, currentUserId));
    } catch {
      // If API fails, show empty — no crash
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useFocusEffect(useCallback(() => { void loadStories(); }, [loadStories]));

  // Check if current user has stories
  const hasOwnStory = groups.some(g => g.user_id === currentUserId);

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <AppText variant="micro" tone="muted" weight="bold">القصص</AppText>
        <Pressable onPress={onAddStory}>
          <AppText variant="micro" tone="cyan">+ أضف قصة</AppText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={storiesStyles.row}>
        {/* Add story button (always first) */}
        {!hasOwnStory && (
          <Pressable style={({ pressed }) => [storiesStyles.item, pressed && { opacity: 0.8 }]} onPress={onAddStory}>
            <View style={[storiesStyles.outerRing, { borderColor: colors.accentCyan }]}>
              <View style={[storiesStyles.ring, { borderColor: colors.mediaCanvas ?? "#07091A" }]}>
                <View style={[storiesStyles.avatar, { backgroundColor: "rgba(56,232,255,0.15)" }]}>
                  <Ionicons name="add" size={20} color={colors.accentCyan} />
                </View>
              </View>
            </View>
            <AppText variant="micro" tone="primary" numberOfLines={1} style={storiesStyles.label}>قصتي</AppText>
          </Pressable>
        )}

        {/* Story groups */}
        {groups.map((group, idx) => {
          const isOwn = group.user_id === currentUserId;
          const storyColor = group.is_live ? "#ef4444" : STORY_COLORS[idx % STORY_COLORS.length];
          const seen = group.all_seen && !group.is_live;

          return (
            <Pressable
              key={group.user_id}
              style={({ pressed }) => [storiesStyles.item, pressed && { opacity: 0.8 }]}
              onPress={() => isOwn && !hasOwnStory ? onAddStory?.() : onViewStory?.(groups, idx)}
            >
              <View style={[storiesStyles.outerRing, { borderColor: seen ? colors.border : storyColor }]}>
                <View style={[storiesStyles.ring, { borderColor: seen ? "transparent" : colors.mediaCanvas ?? "#07091A" }]}>
                  {group.author_avatar ? (
                    <Image source={{ uri: group.author_avatar }} style={storiesStyles.avatarImg} />
                  ) : isOwn ? (
                    <View style={[storiesStyles.avatar, { backgroundColor: "rgba(56,232,255,0.15)" }]}>
                      <Ionicons name="add" size={20} color={colors.accentCyan} />
                    </View>
                  ) : (
                    <View style={[storiesStyles.avatar, { backgroundColor: `${storyColor}22` }]}>
                      <AppText variant="bodySm" weight="bold" style={{ color: storyColor }}>
                        {(group.author_name || "U").slice(0, 1)}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* LIVE badge */}
              {group.is_live && (
                <View style={storiesStyles.liveBadge}>
                  <View style={storiesStyles.liveDot} />
                  <Text style={storiesStyles.liveText}>LIVE</Text>
                </View>
              )}

              {/* News channel verified badge */}
              {group.is_news_channel && !group.is_live && (
                <View style={storiesStyles.channelBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#0ea5e9" />
                </View>
              )}

              <AppText variant="micro" tone={seen ? "muted" : "primary"} numberOfLines={1} style={storiesStyles.label}>
                {isOwn ? "قصتي" : group.author_name}
              </AppText>
            </Pressable>
          );
        })}

        {loading && (
          <View style={[storiesStyles.item, { justifyContent: "center" }]}>
            <ActivityIndicator size="small" color={colors.accentCyan} />
          </View>
        )}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginTop: 4 }} />
    </View>
  );
}

const storiesStyles = StyleSheet.create({
  row: { paddingHorizontal: 0, paddingVertical: 8, gap: 14, flexDirection: "row" },
  item: { alignItems: "center", width: 66 },
  outerRing: {
    width: 66, height: 66, borderRadius: 22, borderWidth: 2.5, padding: 3,
    alignItems: "center", justifyContent: "center",
  },
  ring: {
    width: "100%" as any, height: "100%" as any, borderRadius: 18,
    borderWidth: 2, padding: 2, alignItems: "center", justifyContent: "center",
  },
  avatar: {
    width: "100%" as any, height: "100%" as any, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: {
    width: "100%" as any, height: "100%" as any, borderRadius: 14,
  },
  label: { marginTop: 5, textAlign: "center", maxWidth: 66 },
  liveBadge: {
    position: "absolute", top: 0, right: -2,
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#ef4444", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#0a0a0f",
  },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  channelBadge: {
    position: "absolute", bottom: 18, right: -2,
    backgroundColor: "#0a0a0f", borderRadius: 10, padding: 1,
  },
});

type MediaFeedTab = "forYou" | "following" | "trending" | "video";

const MEDIA_TABS: Array<{ key: MediaFeedTab; label: string; subtitle: string }> = [
  { key: "forYou", label: "لك", subtitle: "أحدث ما يحدث الآن" },
  { key: "following", label: "متابَعون", subtitle: "منشورات من تتابعهم" },
  { key: "trending", label: "الترند", subtitle: "الأكثر تفاعلاً في شبكتك" },
  { key: "video", label: "الفيديو", subtitle: "المنشورات المرئية أولاً" },
];

function FeedTabChip({
  label,
  subtitle,
  active,
  onPress,
}: {
  label: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles((c) => ({
    tabChip: {
      flex: 1,
      minHeight: 72,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: "rgba(255,255,255,0.03)",
    },
    tabChipActive: {
      backgroundColor: "rgba(56,232,255,0.10)",
      borderColor: "rgba(56,232,255,0.35)",
    },
  }));
  return (
    <Pressable onPress={onPress} style={[styles.tabChip, active && styles.tabChipActive]}>
      <AppText variant="bodySm" weight="bold" tone={active ? "primary" : "secondary"}>
        {label}
      </AppText>
      <AppText variant="micro" tone={active ? "cyan" : "muted"} numberOfLines={1}>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    headerWrap: { paddingTop: 8 },
    list: { paddingHorizontal: 16, paddingBottom: 110 },
    topbar: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, paddingVertical: 8 },
    titleBlock: { flex: 1, paddingRight: 12 },
    kickerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 10 },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: c.accentCyan,
    },
    topbarSubtitle: { marginTop: 6, maxWidth: 260 },
    topbarActions: { flexDirection: "row" as const, gap: 8, alignItems: "center" as const },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconBtnPrimary: { backgroundColor: c.accentBlue, borderColor: "rgba(255,255,255,0.12)" },
    composer: { padding: 14, marginTop: 12 },
    composerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    composerBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(56,232,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.22)",
    },
    headerAvatar: { width: 34, height: 34, borderRadius: 12 },
    headerAvatarFallback: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    loadingContainer: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    searchWrap: { marginTop: 12 },
    tabsRow: { flexDirection: "row" as const, gap: 8, marginTop: 14 },
    feedMetaRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginTop: 14,
      paddingBottom: 8,
    },
    emptyCard: { padding: 18, marginTop: 8 },
  }));
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<MediaFeedTab>("forYou");
  const [searchDraft, setSearchDraft] = useState("");
  const [feedError, setFeedError] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (currentTab?: MediaFeedTab) => {
      setFeedError(null);
      try {
        const isFollowing = (currentTab ?? tab) === "following";
        const p = isFollowing ? await getFollowingPosts(30, 0) : await getPosts(30, 0);
        setPosts(Array.isArray(p) ? p : []);
      } catch (e) {
        setFeedError(formatApiError(e));
        setPosts([]);
      }
      setLoading(false);
    },
    [tab]
  );

  useEffect(() => {
    void fetchPosts(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    setFeedError(null);
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

  const handleRepost = async (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const was = post.reposted_by_me;
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, reposted_by_me: !was, reposts_count: was ? (p.reposts_count || 1) - 1 : (p.reposts_count || 0) + 1 } : p
    ));
    try {
      if (was) await unrepostPost(postId); else await repostPost(postId);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, reposted_by_me: was, reposts_count: post.reposts_count } : p
      ));
    }
  };

  const handleSave = async (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const was = post.saved_by_me;
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, saved_by_me: !was } : p
    ));
    try {
      if (was) await unsavePost(postId); else await savePost(postId);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, saved_by_me: was } : p
      ));
    }
  };

  const visiblePosts = useMemo(() => {
    if (tab === "video") {
      return posts.filter((post) => Boolean(post.image_url));
    }
    if (tab === "trending") {
      return [...posts].sort(
        (a, b) =>
          b.likes_count +
          b.comments_count * 2 +
          (b.reposts_count || 0) * 3 -
          (a.likes_count + a.comments_count * 2 + (a.reposts_count || 0) * 3)
      );
    }
    return posts;
  }, [posts, tab]);

  const emptyStateCopy =
    tab === "video"
      ? "أضف منشوراً بصرياً ليظهر هنا."
      : tab === "trending"
        ? "لا توجد منشورات متداولة بعد."
        : tab === "following"
          ? "تابع أشخاصاً لترى منشوراتهم هنا."
          : "ابدأ النبض الإعلامي بأول منشور.";

  const tabMeta = useMemo(() => MEDIA_TABS.find((item) => item.key === tab) ?? MEDIA_TABS[0], [tab]);


  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MediaPostRow post={item} onLike={handleLike} onRepost={handleRepost} onSave={handleSave} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentCyan} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.topbar}>
              <View style={styles.titleBlock}>
                <View style={styles.kickerRow}>
                  <View style={styles.liveDot} />
                  <AppText variant="micro" weight="bold" tone="cyan">
                    ميديا الآن
                  </AppText>
                </View>
                <AppText variant="h1" weight="bold">
                  موجز اجتماعي سريع
                </AppText>
                <AppText variant="bodySm" tone="secondary" style={styles.topbarSubtitle}>
                  {tabMeta.subtitle}
                </AppText>
              </View>
              <View style={styles.topbarActions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => navigation.navigate("DirectMessages")}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => {
                    const q = searchDraft.trim();
                    navigation.navigate("Search", {
                      ...(q ? { q } : {}),
                      source: "feed",
                    });
                  }}
                >
                  <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={() => navigation.navigate("CreatePost")}>
                  <Ionicons name="add" size={20} color={colors.white} />
                </Pressable>
              </View>
            </View>

            {/* Stories bar */}
            <View style={{ marginTop: 10 }}>
              <StoriesBar
                currentUserId={user?.id ?? 0}
                onAddStory={() => navigation.navigate("CreateStory" as any)}
                onViewStory={(groups, index) => navigation.navigate("StoryViewer" as any, { groups, startIndex: index })}
              />
            </View>

            <GlassCard strength="strong" style={[styles.composer, { marginTop: 4 }]}>
              <View style={styles.composerRow}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <AppText variant="micro" weight="bold" style={{ color: colors.white }}>
                      {(user?.name || "U").slice(0, 2).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("CreatePost")}>
                  <AppText variant="bodySm" tone="muted">
                    شارك رأياً أو صورة أو لحظة جديدة...
                  </AppText>
                </Pressable>
                <View style={styles.composerBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.accentCyan} />
                  <AppText variant="micro" tone="cyan" weight="bold">
                    عام
                  </AppText>
                </View>
              </View>
            </GlassCard>

            <View style={styles.searchWrap}>
              <UnifiedSearchField
                value={searchDraft}
                onChangeText={setSearchDraft}
                dense
                onSubmitSearch={() => {
                  const q = searchDraft.trim();
                  void (async () => {
                    if (q) await addRecentSearch(q);
                    navigation.navigate("Search", {
                      ...(q ? { q } : {}),
                      source: "feed",
                    });
                  })();
                }}
              />
            </View>

            <View style={styles.tabsRow}>
              {MEDIA_TABS.map((item) => (
                <FeedTabChip
                  key={item.key}
                  label={item.label}
                  subtitle={item.subtitle}
                  active={tab === item.key}
                  onPress={() => {
                    setTab(item.key);
                  }}
                />
              ))}
            </View>

            <View style={styles.feedMetaRow}>
              <AppText variant="micro" tone="muted" weight="bold">
                {visiblePosts.length} منشور
              </AppText>
              <AppText variant="micro" tone="muted">
                {tab === "trending" ? "مرتبة حسب التفاعل" : tab === "video" ? "منشورات بصريّة" : "تدفّق سريع ومتجدد"}
              </AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accentCyan} />
            </View>
          ) : feedError ? (
            <InlineErrorRetry message={feedError} onRetry={() => void fetchPosts()} />
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="newspaper-outline" size={44} color={colors.textMuted} style={{ alignSelf: "center" }} />
              <AppText variant="body" tone="secondary" style={{ textAlign: "center", marginTop: 12 }}>
                لا يوجد محتوى بعد.
              </AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 6 }}>
                {emptyStateCopy}
              </AppText>
            </GlassCard>
          )
        }
      />
    </Screen>
  );
}
