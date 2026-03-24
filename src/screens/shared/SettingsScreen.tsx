import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { colors } from "../../theme/colors";
import { SUPPORTED_LANGUAGES, setAppLanguage, type AppLanguage } from "../../i18n";
import { getApiBaseUrl, getApiDocsUrl, pingApiHealth } from "../../lib/api";

const LANG_META: Record<AppLanguage, { labelKey: string; native: string }> = {
  en: { labelKey: "settings.langEn", native: "English" },
  ar: { labelKey: "settings.langAr", native: "العربية" },
  fr: { labelKey: "settings.langFr", native: "Français" },
  es: { labelKey: "settings.langEs", native: "Español" },
  hi: { labelKey: "settings.langHi", native: "हिन्दी" },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const extra = Constants.expoConfig?.extra as any;
  const firebaseReady = Boolean(extra?.firebase?.apiKey && extra?.firebase?.projectId);
  const googleReady = Boolean(extra?.googleAuth?.iosClientId || extra?.googleAuth?.webClientId);

  const selectLang = async (lng: AppLanguage) => {
    await setAppLanguage(lng);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("settings.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>{t("settings.language")}</Text>
        <Text style={styles.sectionHint}>{t("settings.languageSubtitle")}</Text>
        <Text style={styles.restartHint}>{t("settings.restartHint")}</Text>

        {SUPPORTED_LANGUAGES.map((lng) => {
          const active = i18n.language === lng || i18n.language.startsWith(`${lng}-`);
          return (
            <TouchableOpacity
              key={lng}
              style={[styles.langRow, active && styles.langRowActive]}
              onPress={() => selectLang(lng)}
              activeOpacity={0.88}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.langTitle}>{t(LANG_META[lng].labelKey)}</Text>
                <Text style={styles.langNative}>{LANG_META[lng].native}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.accentCyan} /> : null}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.section, { marginTop: 24 }]}>{t("settings.diagnostics")}</Text>
        <Text style={styles.sectionHint}>{t("settings.apiEndpoint")}</Text>
        <Text style={styles.diagUrl} selectable>
          {getApiBaseUrl()}
        </Text>
        <Text style={styles.section}>{t("settings.apiDocs")}</Text>
        <Text style={styles.sectionHint}>{t("settings.apiDocsHint")}</Text>
        <Text style={styles.diagUrl} selectable>
          {getApiDocsUrl()}
        </Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={() => Linking.openURL(getApiDocsUrl())}
        >
          <Text style={styles.testBtnText}>{t("settings.openDocs")}</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionHint, { marginTop: 16 }]}>
          {googleReady && firebaseReady ? t("settings.googleReady") : t("settings.googleMissing")}
        </Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={async () => {
            const r = await pingApiHealth();
            Alert.alert(
              r.ok ? t("settings.serverOk") : t("settings.serverFail"),
              r.ok ? r.detail : `${r.detail}\n\n${t("settings.rebuildHint")}`
            );
          }}
        >
          <Text style={styles.testBtnText}>{t("settings.testConnection")}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
  scroll: { padding: 16, paddingBottom: 100 },
  section: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  sectionHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  restartHint: { color: colors.accentCyan, fontSize: 12, marginBottom: 16, lineHeight: 18 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginBottom: 10,
  },
  langRowActive: { borderColor: colors.accentBlue, backgroundColor: "rgba(76,111,255,0.08)" },
  langTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  langNative: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  diagUrl: {
    color: colors.accentCyan,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 8,
  },
  testBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    marginTop: 8,
  },
  testBtnText: { color: colors.accentBlue, fontSize: 14, fontWeight: "700" },
});
