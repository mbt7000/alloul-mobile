import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAppTheme } from "../../../theme/ThemeContext";
import { SUPPORTED_LANGUAGES, setAppLanguage, type AppLanguage } from "../../../i18n/index";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { useHomeMode } from "../../../state/mode/HomeModeContext";
import {
  getSubscriptionStatus,
  getCompanyMembers,
  getProjects,
  getAllCompanyTasks,
} from "../../../api";

const LANG_META: Record<AppLanguage, { labelKey: string; native: string }> = {
  en: { labelKey: "settings.langEn", native: "English" },
  ar: { labelKey: "settings.langAr", native: "العربية" },
  fr: { labelKey: "settings.langFr", native: "Français" },
  es: { labelKey: "settings.langEs", native: "Español" },
  hi: { labelKey: "settings.langHi", native: "हिन्दी" },
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:    { label: "المبتدئ",          color: "#6b7280" },
  pro:        { label: "الاحترافي",        color: "#2563eb" },
  pro_plus:   { label: "الاحترافي المتقدم", color: "#7c3aed" },
  admin:      { label: "المدير",           color: "#dc2626" },
};

function avatarColor(name: string) {
  const palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { user, signOut } = useAuth();
  const { company, isMember, isActive } = useCompany();
  const { mode: homeMode, setMode: setHomeMode, canUseCompanyMode } = useHomeMode();

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const build = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "local";

  const [planId, setPlanId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  const loadCompanyData = useCallback(async () => {
    if (!company?.id) return;
    const [sub, members, projects, tasks] = await Promise.all([
      getSubscriptionStatus().catch(() => ({ plan_id: null })),
      getCompanyMembers().catch(() => [] as any[]),
      getProjects(company.id).catch(() => [] as any[]),
      getAllCompanyTasks(company.id).catch(() => [] as any[]),
    ]);
    setPlanId((sub as any).plan_id ?? null);
    setMemberCount(Array.isArray(members) ? members.length : null);
    setProjectCount(Array.isArray(projects) ? projects.length : null);
    setTaskCount(Array.isArray(tasks) ? tasks.length : null);
  }, [company?.id]);

  useEffect(() => { void loadCompanyData(); }, [loadCompanyData]);

  const selectLang = async (lng: AppLanguage) => { await setAppLanguage(lng); };

  const confirmSignOut = () => {
    Alert.alert("تسجيل الخروج", "هل تريد إنهاء الجلسة الحالية؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const displayName = user?.name || user?.username || "المستخدم";
  const initials = displayName.slice(0, 2).toUpperCase();
  const bg = avatarColor(displayName);
  const planCfg = planId ? (PLAN_LABELS[planId] ?? { label: planId, color: "#6b7280" }) : null;

  const c = colors;

  // ── Section header ───────────────────────────────────────────
  const SectionTitle = ({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 24 }}>
      <Ionicons name={icon} size={14} color={c.textMuted} />
      <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {title}
      </Text>
    </View>
  );

  // ── Nav row ───────────────────────────────────────────────────
  const NavRow = ({
    icon, iconColor, label, subtitle, onPress, badge,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    label: string;
    subtitle?: string;
    onPress: () => void;
    badge?: string;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: pressed ? c.cardElevated : "transparent",
        borderRadius: 12,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconColor + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>{label}</Text>
        {subtitle ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={{ backgroundColor: iconColor + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <Text style={{ color: iconColor, fontSize: 11, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
    </Pressable>
  );

  // ── Card wrapper ──────────────────────────────────────────────
  const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      overflow: "hidden" as const,
    }, style]}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text style={{ color: c.textPrimary, fontSize: 22, fontWeight: "800" }}>الإعدادات</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Profile Hero ── */}
        <Card style={{ padding: 16, marginBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: "800" }}>{displayName}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{user?.email || ""}</Text>
              {user?.is_admin ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <View style={{ backgroundColor: "#dc262622", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "700" }}>مدير النظام</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </Card>

        {/* ── Company Management ── */}
        {isMember && company ? (
          <>
            <SectionTitle title="إدارة الشركة" icon="business-outline" />
            <Card>
              {/* Company name + plan badge */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentCyan + "22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="business" size={17} color={c.accentCyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: "800" }}>{company.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>كود الدعوة: {company.i_code}</Text>
                </View>
                {planCfg ? (
                  <View style={{ backgroundColor: planCfg.color + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: planCfg.color + "44" }}>
                    <Text style={{ color: planCfg.color, fontSize: 11, fontWeight: "700" }}>{planCfg.label}</Text>
                  </View>
                ) : null}
              </View>

              {/* Usage stats row */}
              {(memberCount !== null || projectCount !== null || taskCount !== null) ? (
                <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border }}>
                  {[
                    { label: "أعضاء", value: memberCount, icon: "people-outline" as const, color: "#f59e0b" },
                    { label: "مشاريع", value: projectCount, icon: "folder-open-outline" as const, color: c.accentBlue },
                    { label: "مهام", value: taskCount, icon: "checkbox-outline" as const, color: c.accentCyan },
                  ].map((stat) => (
                    <View key={stat.label} style={{ flex: 1, alignItems: "center", paddingVertical: 12, gap: 4 }}>
                      <Ionicons name={stat.icon} size={16} color={stat.color} />
                      <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: "800" }}>{stat.value ?? "—"}</Text>
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Management nav rows */}
              <NavRow
                icon="people-outline"
                iconColor="#f59e0b"
                label="أعضاء الفريق"
                subtitle="إدارة الأعضاء والصلاحيات"
                onPress={() => navigation.navigate("Team" as never)}
              />
              <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} />
              <NavRow
                icon="star-outline"
                iconColor="#7c3aed"
                label="خطط الاشتراك"
                subtitle={planCfg ? `خطتك الحالية: ${planCfg.label}` : "عرض وترقية خطتك"}
                onPress={() => navigation.navigate("SubscriptionPlans" as never)}
                badge={planCfg?.label}
              />
              <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} />
              <NavRow
                icon="copy-outline"
                iconColor="#059669"
                label="نسخ كود الدعوة"
                subtitle={company.i_code}
                onPress={() => {
                  Clipboard.setString(company.i_code);
                  Alert.alert("تم النسخ", `كود الدعوة: ${company.i_code}`);
                }}
              />

              {canUseCompanyMode ? (
                <>
                  <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} />
                  <Pressable
                    onPress={() => {
                      const target = homeMode === "public" ? "company" : "public";
                      setHomeMode(target);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      backgroundColor: pressed ? c.cardElevated : "transparent",
                      borderRadius: 12,
                    })}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentCyan + "22", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="swap-horizontal-outline" size={17} color={c.accentCyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>
                        {homeMode === "public" ? "التبديل لوضع الشركة" : "التبديل للوضع العام"}
                      </Text>
                      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                        الوضع الحالي: {homeMode === "public" ? "عام" : "شركة"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
                  </Pressable>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* ── Appearance ── */}
        <SectionTitle title="المظهر" icon="color-palette-outline" />
        <Card>
          <View style={{ flexDirection: "row", gap: 10, padding: 14 }}>
            {(["light", "dark"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: mode === m ? c.accentBlue : c.border,
                  backgroundColor: mode === m ? c.cardStrong : c.bgSurface,
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name={m === "light" ? "sunny-outline" : "moon-outline"}
                  size={18}
                  color={mode === m ? c.accentBlue : c.textMuted}
                />
                <Text style={{ color: mode === m ? c.textPrimary : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                  {m === "light" ? t("settings.themeLight") : t("settings.themeDark")}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* ── Language ── */}
        <SectionTitle title="اللغة" icon="language-outline" />
        <Card>
          {SUPPORTED_LANGUAGES.map((lng, i) => {
            const active = i18n.language === lng || i18n.language.startsWith(`${lng}-`);
            return (
              <React.Fragment key={lng}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} /> : null}
                <Pressable
                  onPress={() => selectLang(lng)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: pressed ? c.cardElevated : "transparent",
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: active ? "800" : "600" }}>
                      {t(LANG_META[lng].labelKey)}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{LANG_META[lng].native}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={c.accentCyan} /> : null}
                </Pressable>
              </React.Fragment>
            );
          })}
        </Card>

        {/* ── Admin Console ── */}
        {user?.is_admin ? (
          <>
            <SectionTitle title="الإدارة" icon="shield-checkmark-outline" />
            <Card>
              <NavRow
                icon="shield-checkmark-outline"
                iconColor="#dc2626"
                label={t("settings.adminConsole")}
                subtitle={t("settings.adminSubtitle")}
                onPress={() => navigation.navigate("AdminHub" as never)}
              />
            </Card>
          </>
        ) : null}

        {/* ── Account ── */}
        <SectionTitle title="الحساب" icon="person-outline" />
        <Card>
          <Pressable
            onPress={() => navigation.navigate("PhoneVerify" as never)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              backgroundColor: pressed ? c.cardElevated : "transparent",
              borderRadius: 12,
            })}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#059669" + "22", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="call-outline" size={17} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>{t("phone.title")}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                {user?.phone ? t("phone.alreadyVerified") : t("phone.subtitle")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
          </Pressable>

          <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="information-circle-outline" size={17} color={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>الإصدار {appVersion}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                Build {String(build)} · {Platform.OS}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 14 }} />

          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 14,
              backgroundColor: pressed ? "rgba(255,92,124,0.08)" : "transparent",
              borderRadius: 12,
            })}
          >
            <Ionicons name="log-out-outline" size={17} color={c.accentRose} />
            <Text style={{ color: c.accentRose, fontSize: 14, fontWeight: "700" }}>{t("drawer.signOut")}</Text>
          </Pressable>
        </Card>

      </ScrollView>
    </View>
  );
}
