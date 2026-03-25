import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { login, register, getApiBaseUrl, pingApiHealth } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { colors } from "../../theme/colors";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const firebase = (extra?.firebase as Record<string, string> | undefined) || {};
  const googleAuth = (extra?.googleAuth as Record<string, string> | undefined) || {};
  const firebaseReady = Boolean(firebase?.apiKey && firebase?.projectId);
  const googleReady = Boolean(googleAuth?.iosClientId || googleAuth?.webClientId);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    if (!email.includes("@")) {
      setError(t("auth.validEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }
    if (isRegister && !username) {
      setError(t("auth.usernameRequired"));
      return;
    }
    setLoading(true);
    try {
      if (isRegister) await register(username, email, password);
      else await login(email, password);
      await refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e?.message === "NETWORK_UNREACHABLE") setError(t("auth.networkError"));
      else setError(e?.message || t("auth.authFailed"));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.brandName}>{t("auth.brand")}</Text>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder={t("auth.username")}
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder={t("auth.email")}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t("auth.password")}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.eyeText}>{showPassword ? t("common.hide") : t("common.show")}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{isRegister ? t("auth.createAccount") : t("auth.signIn")}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.socialPaused}>{t("auth.socialPaused")}</Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("common.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={[styles.socialBtn, styles.socialBtnOff]} disabled>
            <Text style={[styles.socialText, styles.socialTextMuted]}>{t("auth.continueGoogle")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialBtn, styles.socialBtnOff]} disabled>
            <Text style={[styles.socialText, styles.socialTextMuted]}>{t("auth.continueMicrosoft")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            <Text style={styles.switchText}>{isRegister ? t("auth.switchSignIn") : t("auth.switchRegister")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.diagBox}>
          <Text style={styles.diagTitle}>{t("settings.diagnostics")}</Text>
          <Text style={styles.diagLabel}>{t("settings.apiEndpoint")}</Text>
          <Text style={styles.diagUrl} selectable>
            {getApiBaseUrl()}
          </Text>
          <Text style={styles.diagLabel}>{t("auth.emailLoginActive")}</Text>
          <Text style={styles.diagLabel}>
            {googleReady && firebaseReady ? t("settings.googleReady") : t("settings.googleMissing")}
          </Text>
          <TouchableOpacity
            style={styles.diagBtn}
            onPress={async () => {
              const r = await pingApiHealth();
              Alert.alert(
                r.ok ? t("settings.serverOk") : t("settings.serverFail"),
                r.ok ? r.detail : `${r.detail}\n\n${t("settings.rebuildHint")}`
              );
            }}
          >
            <Text style={styles.diagBtnText}>{t("settings.testConnection")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  logoContainer: { alignItems: "center", marginBottom: 48 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  logoText: { color: colors.white, fontSize: 32, fontWeight: "900" },
  brandName: { color: colors.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 16 },
  tagline: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  form: { gap: 14 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { color: colors.accentCyan, fontSize: 12, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  socialPaused: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  socialBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  socialBtnOff: { opacity: 0.55 },
  socialText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  socialTextMuted: { color: colors.textMuted },
  switchText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 16 },
  diagBox: {
    marginTop: 28,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  diagTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  diagLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  diagUrl: { color: colors.accentCyan, fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  diagBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  diagBtnText: { color: colors.accentBlue, fontSize: 13, fontWeight: "700" },
});
