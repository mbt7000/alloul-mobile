import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";
import { getHandovers, type HandoverRow } from "../../lib/api";

export default function HandoverScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [items, setItems] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getHandovers();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Err";
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("handover.title")}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryTxt}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("handover.empty")}</Text>}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.status}>{item.status}</Text>
              {item.from_person || item.to_person ? (
                <Text style={styles.meta}>
                  {item.from_person || "—"} → {item.to_person || "—"}
                </Text>
              ) : null}
              <Text style={styles.progress}>
                {t("handover.tasks", { done: item.completed_tasks, total: item.tasks })}
              </Text>
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
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
  retryTxt: { color: colors.accentBlue, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 100 },
  card: { padding: 14, marginBottom: 10 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
  status: { color: colors.accentTeal, fontSize: 12, fontWeight: "700", marginTop: 6, textTransform: "capitalize" },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  progress: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
