import React, { useMemo, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "react-i18next";
import { sendOtp, verifyOtp } from "../../../api";

type Step = "phone" | "code" | "done";

export default function PhoneVerifyScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const codeInputRef = useRef<TextInput>(null);

  const handleSendCode = async () => {
    setError("");
    const cleaned = phone.replace(/\s/g, "");
    if (!cleaned || cleaned.length < 8) {
      setError(t("phone.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(cleaned);
      if (res.success) {
        setStep("code");
        // In dev mode, the API returns the code in the message
        const match = res.message.match(/(\d{6})/);
        if (match) setDevCode(match[1]);
        setTimeout(() => codeInputRef.current?.focus(), 300);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.status === 429) setError(t("phone.tooManyRequests"));
      else setError(e?.message || t("phone.invalidPhone"));
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError("");
    const trimmed = code.trim();
    if (!trimmed || trimmed.length !== 6) {
      setError(t("phone.invalidCode"));
      return;
    }
    setLoading(true);
    try {
      const cleaned = phone.replace(/\s/g, "");
      const res = await verifyOtp(cleaned, trimmed);
      if (res.success) {
        setStep("done");
      }
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.message?.includes("expired")) setError(t("phone.expired"));
      else if (e?.message?.includes("Invalid")) setError(t("phone.wrongCode"));
      else if (e?.message?.includes("Too many")) setError(t("phone.tooManyRequests"));
      else setError(e?.message || t("phone.wrongCode"));
    }
    setLoading(false);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
        header: { alignItems: "center", marginBottom: 40 },
        iconCircle: {
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        iconText: { color: colors.white, fontSize: 32 },
        title: { color: colors.textPrimary, fontSize: 24, fontWeight: "900", marginTop: 16 },
        subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
        form: { gap: 14 },
        input: {
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.textPrimary,
          fontSize: 18,
          textAlign: "center",
          letterSpacing: 2,
        },
        phoneInput: {
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.textPrimary,
          fontSize: 16,
          textAlign: "left",
        },
        error: { color: colors.danger, fontSize: 13, textAlign: "center" },
        primaryBtn: {
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
        primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
        secondaryBtn: {
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
        },
        secondaryBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
        devBox: {
          marginTop: 20,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        devText: {
          color: colors.accentCyan,
          fontSize: 12,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          textAlign: "center",
        },
        doneContainer: { alignItems: "center", gap: 16 },
        doneIcon: { fontSize: 64 },
        doneText: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" },
        donePhone: { color: colors.textSecondary, fontSize: 16 },
      }),
    [colors]
  );

  if (step === "done") {
    return (
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 60, justifyContent: "center" }]}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneIcon}>✓</Text>
          <Text style={styles.doneText}>{t("phone.verified")}</Text>
          <Text style={styles.donePhone}>{phone}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <Text style={styles.title}>{t("phone.title")}</Text>
          <Text style={styles.subtitle}>
            {step === "phone" ? t("phone.subtitle") : t("phone.enterCode")}
          </Text>
        </View>

        <View style={styles.form}>
          {step === "phone" ? (
            <>
              <TextInput
                style={styles.phoneInput}
                placeholder={t("phone.phonePlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendCode} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("phone.sendCode")}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                ref={codeInputRef}
                style={styles.input}
                placeholder={t("phone.codePlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("phone.verify")}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.secondaryBtnText}>{t("phone.resend")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                  setDevCode("");
                }}
              >
                <Text style={styles.secondaryBtnText}>{t("phone.changeNumber")}</Text>
              </TouchableOpacity>
{/* Dev code hidden in production */}
            </>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>{t("phone.skip")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
