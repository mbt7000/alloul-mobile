/**
 * ChangePasswordScreen — ALLOUL&Q
 */
import React, { useState } from "react";
import { View, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api/client";
import { BRAND } from "../../../brand";

function strengthScore(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 12) s += 1;
  if (pw.length >= 16) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^\w\s]/.test(pw)) s += 1;
  if (s <= 2) return { score: s, label: "ضعيف", color: "#ef4444" };
  if (s <= 4) return { score: s, label: "متوسط", color: "#f59e0b" };
  return { score: s, label: "قوي", color: "#10b981" };
}

export default function ChangePasswordScreen() {
  const nav = useNavigation<any>();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const s = strengthScore(next);

  const save = async () => {
    if (next !== confirm) { Alert.alert("خطأ", "كلمتا المرور غير متطابقتين"); return; }
    setSaving(true);
    try {
      await apiFetch("/security/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next, logout_others: true }),
      });
      Alert.alert("تم الحفظ", "تم تحديث كلمة المرور بنجاح");
      nav.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر التحديث");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#000" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 0.5, borderBottomColor: "#1a1a1a",
        }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
            تغيير كلمة المرور
          </AppText>
          <Pressable
            onPress={save}
            disabled={saving || next.length < 12 || next !== confirm}
            style={{
              paddingHorizontal: 16, paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: next.length >= 12 && next === confirm ? "#fff" : "#333",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? <ActivityIndicator size="small" color="#000" /> : (
              <AppText style={{
                color: next.length >= 12 && next === confirm ? "#000" : "#666",
                fontSize: 13, fontWeight: "800",
              }}>حفظ</AppText>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <Field label="كلمة المرور الحالية" value={current} onChange={setCurrent} />
          <Field label="كلمة المرور الجديدة" value={next} onChange={setNext} />

          {next.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    backgroundColor: i <= s.score ? s.color : "#1a1a1a",
                  }} />
                ))}
              </View>
              <AppText style={{ color: s.color, fontSize: 11 }}>
                قوة كلمة المرور: {s.label}
              </AppText>
            </View>
          )}

          <Field label="تأكيد كلمة المرور" value={confirm} onChange={setConfirm} />

          <View style={{
            padding: 14, borderRadius: 12,
            backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a",
          }}>
            <AppText style={{ color: "#888", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
              متطلبات كلمة المرور:
            </AppText>
            <Req ok={next.length >= 12} text="12 حرفاً على الأقل" />
            <Req ok={/[A-Z]/.test(next)} text="حرف كبير واحد على الأقل" />
            <Req ok={/[a-z]/.test(next)} text="حرف صغير واحد على الأقل" />
            <Req ok={/\d/.test(next)} text="رقم واحد على الأقل" />
            <Req ok={/[^\w\s]/.test(next)} text="رمز خاص واحد على الأقل" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <AppText style={{ color: "#71767b", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        placeholderTextColor="#444"
        style={{
          color: "#fff",
          fontSize: 15,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#1a1a1a",
        }}
      />
    </View>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 }}>
      <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={12} color={ok ? BRAND.colors.success : "#666"} />
      <AppText style={{ color: ok ? "#ddd" : "#666", fontSize: 11 }}>{text}</AppText>
    </View>
  );
}
