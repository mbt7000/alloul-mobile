import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import {
  getChannelMessages,
  sendChannelMessage,
  deleteChannelMessage,
  type ChannelMessageRow,
  type ChannelRow,
} from "../../../api";

const CHANNEL_TYPE_ICON: Record<string, string> = {
  general:      "#",
  announcement: "📢",
  department:   "🏢",
  project:      "🗂",
};

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AppText style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{initial}</AppText>
    </View>
  );
}

function avatarColor(name: string): string {
  const colors = ["#60A5FA", "#34D399", "#A78BFA", "#FB923C", "#F472B6", "#FBBF24"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

export default function ChannelDetailScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const channel: ChannelRow = route.params?.channel;
  const c = colors;

  const [messages, setMessages] = useState<ChannelMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Initial load
  const loadMessages = useCallback(async () => {
    if (!channel?.id) return;
    try {
      const list = await getChannelMessages(channel.id);
      setMessages(list);
      if (list.length > 0) lastIdRef.current = list[list.length - 1].id;
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }, [channel?.id, scrollToBottom]);

  // Polling — fetch only new messages
  const pollMessages = useCallback(async () => {
    if (!channel?.id) return;
    try {
      const newMsgs = await getChannelMessages(channel.id, lastIdRef.current);
      if (newMsgs.length > 0) {
        setMessages((prev) => [...prev, ...newMsgs]);
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        scrollToBottom();
      }
    } catch {
      // silent — keep polling
    }
  }, [channel?.id, scrollToBottom]);

  useEffect(() => {
    void loadMessages();
    pollRef.current = setInterval(pollMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadMessages, pollMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !channel?.id) return;
    setSending(true);
    setInput("");

    // Optimistic local insert
    const optimistic: ChannelMessageRow = {
      id: Date.now(),
      channel_id: channel.id,
      user_id: -1,
      content: text,
      author: { id: -1, name: "أنت" },
      created_at: new Date().toISOString(),
      is_self: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const saved = await sendChannelMessage(channel.id, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m))
      );
      lastIdRef.current = saved.id;
    } catch {
      // revert optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, channel?.id, scrollToBottom]);

  const handleDeleteMessage = useCallback(
    (msg: ChannelMessageRow) => {
      Alert.alert("حذف الرسالة", "هل تريد حذف هذه الرسالة؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            await deleteChannelMessage(channel.id, msg.id).catch(() => {});
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          },
        },
      ]);
    },
    [channel?.id]
  );

  const typeIcon = CHANNEL_TYPE_ICON[channel?.type] || "#";

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: 10,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: `${c.accentCyan}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText style={{ fontSize: 18 }}>{typeIcon}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">{channel?.name}</AppText>
          {channel?.description ? (
            <AppText variant="micro" tone="muted" numberOfLines={1}>{channel.description}</AppText>
          ) : null}
        </View>
        <AppText variant="micro" tone="muted">{messages.length} رسالة</AppText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 60}
      >
        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.accentCyan} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 14, paddingBottom: 12, gap: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                <AppText style={{ fontSize: 40 }}>💬</AppText>
                <AppText variant="bodySm" weight="bold">لا توجد رسائل بعد</AppText>
                <AppText variant="caption" tone="muted">كن أول من يبدأ المحادثة!</AppText>
              </View>
            )}

            {messages.map((msg, idx) => {
              const isSelf = msg.is_self;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showAuthor = !prevMsg || prevMsg.user_id !== msg.user_id;
              const aColor = avatarColor(msg.author.name);

              return (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: isSelf ? "flex-end" : "flex-start",
                    marginTop: showAuthor ? 10 : 2,
                    gap: 8,
                  }}
                >
                  {!isSelf && showAuthor && (
                    <Avatar name={msg.author.name} color={aColor} />
                  )}
                  {!isSelf && !showAuthor && <View style={{ width: 32 }} />}

                  <View style={{ maxWidth: "75%" }}>
                    {showAuthor && !isSelf && (
                      <AppText
                        variant="micro"
                        style={{ color: aColor, fontWeight: "700", marginBottom: 3, marginLeft: 4 }}
                      >
                        {msg.author.name}
                      </AppText>
                    )}
                    <TouchableOpacity
                      onLongPress={() => isSelf && handleDeleteMessage(msg)}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: isSelf ? `${c.accentCyan}22` : "rgba(255,255,255,0.08)",
                        borderRadius: 16,
                        borderTopRightRadius: isSelf ? 4 : 16,
                        borderTopLeftRadius: isSelf ? 16 : 4,
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        borderWidth: 1,
                        borderColor: isSelf ? `${c.accentCyan}44` : c.border,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          color: isSelf ? c.accentCyan : c.textPrimary,
                        }}
                      >
                        {msg.content}
                      </AppText>
                    </TouchableOpacity>
                    <AppText
                      variant="micro"
                      tone="muted"
                      style={{
                        marginTop: 2,
                        textAlign: isSelf ? "right" : "left",
                        marginHorizontal: 4,
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
            borderTopWidth: 1,
            borderTopColor: c.border,
            backgroundColor: c.bg,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`رسالة في #${channel?.name ?? "القناة"}...`}
            placeholderTextColor={c.textMuted}
            multiline
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              color: c.textPrimary,
              borderWidth: 1,
              borderColor: c.border,
              maxHeight: 100,
              textAlign: "right",
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: !input.trim() || sending ? "rgba(255,255,255,0.08)" : c.accentCyan,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={c.accentCyan} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={!input.trim() ? c.textMuted : "#000"}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
