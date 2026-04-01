import React from "react";
import { StyleSheet, View, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../state/auth/AuthContext";
import Screen from "../../../shared/layout/Screen";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { radius } from "../../../theme/radius";

export default function CompanyMoreScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    topStrip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    greenSq: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.accentNeonGreen,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sunBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.accentBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    content: { padding: 16, gap: 14 },
    profileCard: { padding: 16, borderRadius: radius.xl },
    profileRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14 },
    coverPh: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      backgroundColor: c.cardElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    card: { padding: 14 },
    kicker: { letterSpacing: 0.8, textTransform: "uppercase" as const },
  }));
  const { user } = useAuth();
  const displayName = user?.name || user?.username || "عضو";
  const roleLine = user?.bio?.split("\n")[0]?.slice(0, 48) || "مساحة العمل";

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <View style={styles.topStrip}>
        <View style={styles.greenSq}>
          <Ionicons name="document-text" size={18} color={colors.white} />
        </View>
        <AppText variant="micro" weight="bold" tone="secondary" style={{ flex: 1 }}>
          قائمة الأعمال
        </AppText>
        <Pressable onPress={() => Alert.alert("المظهر", "قريباً.")} style={styles.sunBtn}>
          <Ionicons name="sunny-outline" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="h3" weight="bold" numberOfLines={1}>
                {displayName}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {roleLine}
              </AppText>
            </View>
            <View style={styles.coverPh} />
          </View>
        </GlassCard>
        <GlassCard style={styles.card}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            إعدادات المؤسسة
          </AppText>
          <View style={{ marginTop: 10, gap: 8 }}>
            <ListRow title="إدارة الأدوار" subtitle="الصلاحيات ومسارات الوصول" iconLeft="key-outline" onPress={() => navigation.navigate("Roles")} />
            <ListRow title="سجل النشاطات" subtitle="مراجعة أحداث المساحة" iconLeft="pulse-outline" onPress={() => navigation.navigate("Reports")} />
            <ListRow title="الأمان والخصوصية" subtitle="السياسات والوصول" iconLeft="lock-closed-outline" onPress={() => navigation.navigate("Settings")} />
            <ListRow title="الفواتير والاشتراك" subtitle="الخطة والاستخدام" iconLeft="card-outline" onPress={() => navigation.navigate("Settings")} />
            <ListRow title="ملف المستخدم" subtitle="بيانات الحساب" iconLeft="person-outline" onPress={() => navigation.navigate("Profile")} />
            <ListRow title="الشركات" subtitle="إدارة الشركات المرتبطة" iconLeft="business-outline" onPress={() => navigation.navigate("Companies")} />
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
