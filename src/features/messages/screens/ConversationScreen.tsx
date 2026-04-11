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
  listMessages,
  sendMessage,
  deleteDirectMessage,
  type ConversationRow,
  type DirectMessageRow,
} from "../../../api";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

export default function ConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { colors: c } = useAppTheme();

  const conversation: ConversationRow = route.params?.conversation;
  const convId = conversation?.id;

  const [messages, setMessages] = useState<DirectMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (afterId = 0) => {
    if (!convId) return;
    try {
      const msgs = await listMessages(convId, afterId);
      if (afterId === 0) {
        setMessages(msgs);
      } else if (msgs.length > 0) {
        setMessages((prev) => [...prev, ...msgs]);
      }
    } catch {}
    setLoading(false);
  }, [convId]);

  useEffect(() => {
    void load(0);
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(() => {
      setMessages((prev) => {
        const lastId = prev.length > 0 ? prev[prev.length - 1].id : 0;
        void load(lastId);
        return prev;
      });
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !convId) return;
    setSending(true);
    setText("");
    try {
      const msg = await sendMessage(convId, content);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setText(content);
    }
    setSending(false);
  };

  const handleDeleteMessage = (msg: DirectMessageRow) => {
    if (!msg.is_mine) return;
    Alert.alert("حذف الرسالة", "هل تريد حذف هذه الرسالة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          try {
            await deleteDirectMessage(convId, msg.id);
          } catch {
            void load(0);
          }
        },
      },
    ]);
  };

  const otherInitials = (conversation?.other_user_name || "U").slice(0, 2).toUpperCase();
  const myInitials = (user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        {conversation?.other_user_avatar ? (
          <Image source={{ uri: conversation.other_user_avatar }} style={{ width: 36, height: 36, borderRadius: 12 }} />
        ) : (
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
            <AppText variant="caption" weight="bold" style={{ color: c.accentCyan }}>{otherInitials}</AppText>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>
            {conversation?.other_user_name || conversation?.other_user_username || "محادثة"}
          </AppText>
          {conversation?.other_user_username && (
            <AppText variant="micro" tone="muted">@{conversation.other_user_username}</AppText>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.accentCyan} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60, gap: 10 }}>
                <Ionicons name="chatbubble-outline" size={40} color={c.textMuted} />
                <AppText variant="caption" tone="muted">ابدأ المحادثة</AppText>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.is_mine;
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => handleDeleteMessage(item)}
                  style={{
                    flexDirection: isMine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {!isMine && (
                    conversation?.other_user_avatar ? (
                      <Image source={{ uri: conversation.other_user_avatar }} style={{ width: 28, height: 28, borderRadius: 9 }} />
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.cardStrong, alignItems: "center", justifyContent: "center" }}>
                        <AppText style={{ fontSize: 10, fontWeight: "700", color: c.accentCyan }}>{otherInitials}</AppText>
                      </View>
                    )
                  )}
                  {isMine && (
                    user?.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={{ width: 28, height: 28, borderRadius: 9 }} />
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.accentBlue, alignItems: "center", justifyContent: "center" }}>
                        <AppText style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{myInitials}</AppText>
                      </View>
                    )
                  )}
                  <View style={{ maxWidth: "72%" }}>
                    <View style={{
                      backgroundColor: isMine ? c.accentBlue : c.bgCard,
                      borderRadius: 18,
                      borderBottomLeftRadius: isMine ? 18 : 4,
                      borderBottomRightRadius: isMine ? 4 : 18,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: isMine ? 0 : 1,
                      borderColor: c.border,
                    }}>
                      <AppText style={{ color: isMine ? "#fff" : c.textPrimary, fontSize: 15, lineHeight: 22 }}>
                        {item.content}
                      </AppText>
                    </View>
                    <AppText variant="micro" tone="muted" style={{ marginTop: 3, textAlign: isMine ? "right" : "left" }}>
                      {timeAgo(item.created_at)}{item.read_at && isMine ? " · قُرئت" : ""}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.mediaCanvas }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="اكتب رسالة..."
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: c.bgCard, borderRadius: 22, borderWidth: 1, borderColor: c.border, maxHeight: 100 }}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: text.trim() ? c.accentBlue : c.cardStrong, alignItems: "center", justifyContent: "center" }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={text.trim() ? "#fff" : c.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
