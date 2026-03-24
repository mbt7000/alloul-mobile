import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";
import { getNotifications, markRead, markAllNotificationsRead, type NotificationItem } from "../../lib/api";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getNotifications(80);
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Error";
      setError(msg);
      setItems([]);
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

  const onPressItem = async (id: number) => {
    try {
      await markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      /* ignore */
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("notifications.title")}</Text>
        {items.some((n) => !n.read) ? (
          <TouchableOpacity onPress={() => void onMarkAll()} hitSlop={12}>
            <Text style={styles.markAll}>{t("notifications.markAllRead")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.accentCyan}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("notifications.empty")}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.88} onPress={() => void onPressItem(item.id)}>
              <GlassCard style={[styles.card, !item.read && styles.unread]}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <View style={styles.footer}>
                  <Text style={styles.type}>{item.type}</Text>
                  {item.actor_name ? <Text style={styles.actor}>{item.actor_name}</Text> : null}
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
  markAll: { color: colors.accentBlue, fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  err: { color: colors.danger, textAlign: "center" },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  retryText: { color: colors.accentBlue, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 100, gap: 10 },
  card: { padding: 14, marginBottom: 8 },
  unread: { borderColor: colors.accentBlue, borderWidth: 1 },
  itemTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  body: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 20 },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  type: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase" },
  actor: { color: colors.accentCyan, fontSize: 12 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
