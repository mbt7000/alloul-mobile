import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";
import { unifiedSearch, type SearchResultItem } from "../../lib/api";

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const list = await unifiedSearch(query);
      setResults(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Error";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("explore.title")}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={t("explore.searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void runSearch()}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.goBtn} onPress={() => void runSearch()} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.goText}>{t("explore.search")}</Text>}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!searched ? (
        <View style={styles.hintBox}>
          <Ionicons name="compass-outline" size={40} color={colors.accentCyan} />
          <Text style={styles.hint}>{t("explore.hint")}</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.type}-${item.id}-${i}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t("explore.noResults")}</Text>}
          renderItem={({ item }) => (
            <GlassCard style={styles.resultCard}>
              <View style={styles.resultTop}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.resultAvatar} />
                ) : (
                  <View style={styles.resultAvatarPh}>
                    <Text style={styles.resultAvatarTxt}>{item.title.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.typeRow}>
                    <Text style={styles.typePill}>{item.type}</Text>
                  </View>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.resultDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingLeft: 12,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  goBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopRightRadius: 13,
    borderBottomRightRadius: 13,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  goText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  error: { color: colors.danger, marginHorizontal: 16, marginBottom: 8, fontSize: 13 },
  hintBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  hint: { color: colors.textMuted, textAlign: "center", fontSize: 15, lineHeight: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 100, gap: 10 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 32 },
  resultCard: { padding: 14, marginBottom: 8 },
  resultTop: { flexDirection: "row", gap: 12 },
  resultAvatar: { width: 48, height: 48, borderRadius: 14 },
  resultAvatarPh: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(56,232,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultAvatarTxt: { color: colors.accentCyan, fontSize: 18, fontWeight: "800" },
  typeRow: { marginBottom: 4 },
  typePill: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    color: colors.accentTeal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  resultDesc: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
