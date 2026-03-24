import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import GlassCard from "../../components/glass/GlassCard";
import { useAuth } from "../../lib/AuthContext";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refresh } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const initials = (user?.name || user?.username || "?").slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("profile.title")}</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate("Settings")} hitSlop={12}>
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accentCyan} />
        }
      >
        {!user ? (
          <Text style={styles.muted}>{t("profile.signInHint")}</Text>
        ) : (
          <>
            <View style={styles.hero}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.name}>{user.name || user.username}</Text>
              <Text style={styles.username}>@{user.username}</Text>
              {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
              {user.i_code ? (
                <View style={styles.iCode}>
                  <Text style={styles.iCodeText}>#{user.i_code}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{user.posts_count ?? 0}</Text>
                <Text style={styles.statLabel}>{t("profile.posts")}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{user.followers_count ?? 0}</Text>
                <Text style={styles.statLabel}>{t("profile.followers")}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{user.following_count ?? 0}</Text>
                <Text style={styles.statLabel}>{t("profile.following")}</Text>
              </View>
            </View>

            {user.bio ? (
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>{t("profile.bio")}</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </GlassCard>
            ) : null}

            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.88}
              onPress={() => (navigation as any).navigate("Settings")}
            >
              <Ionicons name="options-outline" size={22} color={colors.accentCyan} />
              <Text style={styles.settingsRowText}>{t("profile.openSettings")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
  scroll: { padding: 16, paddingBottom: 100 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
  hero: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 28, marginBottom: 14 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 28,
    marginBottom: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: "900" },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
  username: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  email: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
  iCode: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(76,111,255,0.15)",
  },
  iCodeText: { color: colors.accentBlue, fontSize: 13, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { alignItems: "center" },
  statNum: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  card: { padding: 16, marginBottom: 16 },
  cardTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  bioText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsRowText: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
});
