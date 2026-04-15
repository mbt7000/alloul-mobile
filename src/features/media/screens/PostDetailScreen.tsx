import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../../state/auth/AuthContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import {
  type ApiPost,
  type ApiComment,
  getPost,
  getPostComments,
  createComment,
  deleteComment,
  likePost,
  unlikePost,
  repostPost,
  unrepostPost,
  savePost,
  unsavePost,
  likeComment,
  unlikeComment,
} from "../../../api";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "الآن";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { colors } = useAppTheme();

  const initialPost = route.params?.post as ApiPost | undefined;
  const postId: number = route.params?.postId ?? initialPost?.id;

  const [post, setPost] = useState<ApiPost | null>(initialPost ?? null);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(!initialPost);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    if (!postId) return;
    try {
      const [p, c] = await Promise.all([
        getPost(postId),
        getPostComments(postId),
      ]);
      setPost(p);
      setComments(c);
    } catch {
      // keep what we have
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleLike = async () => {
    if (!post) return;
    const was = post.liked_by_me;
    setPost((p) => p ? { ...p, liked_by_me: !was, likes_count: was ? p.likes_count - 1 : p.likes_count + 1 } : p);
    try {
      if (was) await unlikePost(post.id); else await likePost(post.id);
    } catch {
      setPost((p) => p ? { ...p, liked_by_me: was, likes_count: post.likes_count } : p);
    }
  };

  const handleRepost = async () => {
    if (!post) return;
    const was = post.reposted_by_me;
    setPost((p) => p ? { ...p, reposted_by_me: !was, reposts_count: was ? (p.reposts_count || 1) - 1 : (p.reposts_count || 0) + 1 } : p);
    try {
      if (was) await unrepostPost(post.id); else await repostPost(post.id);
    } catch {
      setPost((p) => p ? { ...p, reposted_by_me: was, reposts_count: post.reposts_count } : p);
    }
  };

  const handleSave = async () => {
    if (!post) return;
    const was = post.saved_by_me;
    setPost((p) => p ? { ...p, saved_by_me: !was } : p);
    try {
      if (was) await unsavePost(post.id); else await savePost(post.id);
    } catch {
      setPost((p) => p ? { ...p, saved_by_me: was } : p);
    }
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || !post) return;
    setSending(true);
    setCommentText("");
    try {
      const c = await createComment(post.id, text);
      setComments((prev) => [...prev, c]);
      setPost((p) => p ? { ...p, comments_count: p.comments_count + 1 } : p);
    } catch {
      setCommentText(text);
    }
    setSending(false);
  };

  const handleDeleteComment = (commentId: number) => {
    if (!post) return;
    Alert.alert("حذف التعليق", "هل تريد حذف هذا التعليق؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          setPost((p) => p ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p);
          try {
            await deleteComment(post.id, commentId);
          } catch {
            void loadData();
          }
        },
      },
    ]);
  };

  const c = colors;

  if (loading || !post) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <AppText variant="bodySm" weight="bold">المنشور</AppText>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  const initials = (post.author_name || "U").slice(0, 2).toUpperCase();

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <AppText variant="bodySm" weight="bold">المنشور</AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 20 }}>
              {/* Post body */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                {post.author_avatar ? (
                  <Image source={{ uri: post.author_avatar }} style={{ width: 48, height: 48, borderRadius: 16 }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
                    <AppText variant="bodySm" weight="bold" style={{ color: c.accentCyan }}>{initials}</AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AppText variant="bodySm" weight="bold">{post.author_name || "User"}</AppText>
                    {post.author_verified && <Ionicons name="checkmark-circle" size={14} color={c.accentCyan} />}
                  </View>
                  <AppText variant="caption" tone="muted">@{post.author_username || "alloul"} · {timeAgo(post.created_at)}</AppText>
                </View>
              </View>

              <AppText variant="body" style={{ lineHeight: 26, marginBottom: 12 }}>{post.content}</AppText>

              {post.image_url ? (
                <Image source={{ uri: post.image_url }} style={{ width: "100%", height: 280, borderRadius: 18, marginBottom: 16 }} resizeMode="cover" />
              ) : null}

              {/* Action row */}
              <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, marginBottom: 16 }}>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onPress={() => inputRef.current?.focus()}>
                  <Ionicons name="chatbubble-outline" size={22} color={c.textMuted} />
                  <AppText variant="caption" tone="muted" weight="bold">{formatCount(post.comments_count)}</AppText>
                </TouchableOpacity>

                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onPress={handleRepost}>
                  <Ionicons name="repeat-outline" size={22} color={post.reposted_by_me ? c.accentEmerald : c.textMuted} />
                  <AppText variant="caption" weight="bold" style={{ color: post.reposted_by_me ? c.accentEmerald : c.textMuted }}>
                    {formatCount(post.reposts_count || 0)}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onPress={handleLike}>
                  <Ionicons name={post.liked_by_me ? "heart" : "heart-outline"} size={22} color={post.liked_by_me ? c.accentRose : c.textMuted} />
                  <AppText variant="caption" weight="bold" style={{ color: post.liked_by_me ? c.accentRose : c.textMuted }}>
                    {formatCount(post.likes_count)}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onPress={handleSave}>
                  <Ionicons name={post.saved_by_me ? "bookmark" : "bookmark-outline"} size={22} color={post.saved_by_me ? c.accentBlue : c.textMuted} />
                </TouchableOpacity>
              </View>

              <AppText variant="caption" weight="bold" tone="muted" style={{ marginBottom: 12 }}>
                التعليقات ({post.comments_count})
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.user_id === user?.id;
            const cInitials = (item.author_name || "U").slice(0, 2).toUpperCase();
            const liked = item.liked_by_me === true;
            const likesCount = item.likes_count ?? 0;

            const handleLikeComment = async () => {
              // Optimistic update
              setComments((prev) => prev.map((x) =>
                x.id === item.id
                  ? { ...x, liked_by_me: !liked, likes_count: Math.max(0, likesCount + (liked ? -1 : 1)) }
                  : x,
              ));
              try {
                if (liked) await unlikeComment(item.id);
                else await likeComment(item.id);
              } catch {
                // Revert on failure
                setComments((prev) => prev.map((x) =>
                  x.id === item.id ? { ...x, liked_by_me: liked, likes_count: likesCount } : x,
                ));
              }
            };

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => isOwn && handleDeleteComment(item.id)}
                style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}
              >
                {item.author_avatar ? (
                  <Image source={{ uri: item.author_avatar }} style={{ width: 36, height: 36, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
                    <AppText variant="micro" weight="bold" style={{ color: c.accentCyan }}>{cInitials}</AppText>
                  </View>
                )}
                <View style={{ flex: 1, backgroundColor: c.bgCard, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: c.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <AppText variant="caption" weight="bold">{item.author_name || item.author_username || "User"}</AppText>
                    <AppText variant="micro" tone="muted">· {timeAgo(item.created_at)}</AppText>
                  </View>
                  <AppText variant="caption">{item.content}</AppText>

                  {/* Comment actions row — like + reply hint */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={handleLikeComment}
                      hitSlop={8}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={14}
                        color={liked ? c.accentRose : c.textMuted}
                      />
                      {likesCount > 0 ? (
                        <AppText variant="micro" style={{ color: liked ? c.accentRose : c.textMuted, fontWeight: "700" }}>
                          {likesCount}
                        </AppText>
                      ) : null}
                    </TouchableOpacity>
                    {isOwn ? (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(item.id)}
                        hitSlop={8}
                      >
                        <AppText variant="micro" style={{ color: c.accentRose, fontWeight: "700" }}>
                          حذف
                        </AppText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Ionicons name="chatbubbles-outline" size={36} color={c.textMuted} />
              <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>لا توجد تعليقات بعد</AppText>
            </View>
          }
        />

        {/* Comment input */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.mediaCanvas }}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 32, height: 32, borderRadius: 10 }} />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
              <AppText variant="micro" weight="bold" style={{ color: c.accentCyan }}>
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
          <TextInput
            ref={inputRef}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="أضف تعليقاً..."
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.bgCard, borderRadius: 20, borderWidth: 1, borderColor: c.border }}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={sending || !commentText.trim()}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: commentText.trim() ? c.accentBlue : c.cardStrong, alignItems: "center", justifyContent: "center" }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={c.white} />
            ) : (
              <Ionicons name="send" size={16} color={commentText.trim() ? c.white : c.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
