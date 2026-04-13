/**
 * EditProfileScreen
 * ─────────────────
 * Edit profile info: name, username, bio, avatar URL, cover URL.
 * Uses existing updateMe API — no backend changes.
 */

import React, { useState } from "react";
import {
  View, ScrollView, TextInput, Pressable, Image, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { updateMe } from "../../../api/auth.api";

export default function EditProfileScreen() {
  const nav = useNavigation<any>();
  const { colors } = useAppTheme();
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.cover_url ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({
        name: name.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        cover_url: coverUrl.trim() || null,
        username: username.trim() !== user?.username ? username.trim() : undefined,
      });
      await refresh();
      Alert.alert("تم الحفظ", "تم تحديث ملفك الشخصي بنجاح");
      nav.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#000" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 0.5, borderBottomColor: "#1a1a1a",
        }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
            تعديل الملف الشخصي
          </AppText>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              paddingHorizontal: 16, paddingVertical: 7,
              borderRadius: 20, backgroundColor: "#fff",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? <ActivityIndicator size="small" color="#000" /> : (
              <AppText style={{ color: "#000", fontSize: 13, fontWeight: "800" }}>حفظ</AppText>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Cover photo preview */}
          <View style={{ height: 140, position: "relative", backgroundColor: "#0a0a0a" }}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="image-outline" size={36} color="#333" />
              </View>
            )}
          </View>

          {/* Avatar overlap */}
          <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
            <View style={{
              width: 84, height: 84, borderRadius: 42,
              backgroundColor: "#0a0a0a",
              borderWidth: 3, borderColor: "#000",
              alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 84, height: 84 }} />
              ) : (
                <AppText style={{ color: colors.accentCyan, fontSize: 32, fontWeight: "800" }}>
                  {(name || username || "U").slice(0, 1).toUpperCase()}
                </AppText>
              )}
            </View>
          </View>

          {/* Form */}
          <View style={{ padding: 16, gap: 18, marginTop: 8 }}>
            <Field label="الاسم" value={name} onChange={setName} placeholder="اسمك الكامل" />
            <Field label="اسم المستخدم" value={username} onChange={setUsername} placeholder="username" maxLength={30} />
            <Field label="النبذة" value={bio} onChange={setBio} placeholder="عرّف الناس عنك..." multiline maxLength={160} />
            <Field label="رابط صورة الملف" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
            <Field label="رابط صورة الغلاف" value={coverUrl} onChange={setCoverUrl} placeholder="https://..." />

            <View style={{
              marginTop: 10,
              padding: 14,
              backgroundColor: "#0a0a0a",
              borderRadius: 14,
              borderWidth: 1, borderColor: "#1a1a1a",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="information-circle-outline" size={16} color="#71767b" />
                <AppText style={{ color: "#71767b", fontSize: 11, fontWeight: "600" }}>معلومات الحساب</AppText>
              </View>
              <InfoRow label="البريد الإلكتروني" value={user?.email ?? "—"} />
              <InfoRow label="الهاتف" value={user?.phone ?? "—"} />
              <InfoRow label="رمز المستخدم" value={user?.i_code ?? "—"} />
            </View>

            <Pressable
              onPress={() => Alert.alert("قريباً", "تغيير كلمة المرور سيتوفر في التحديث القادم")}
              style={{
                padding: 14,
                backgroundColor: "#0a0a0a",
                borderRadius: 14,
                borderWidth: 1, borderColor: "#1a1a1a",
                flexDirection: "row", alignItems: "center", gap: 10,
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 }}>
                تغيير كلمة المرور
              </AppText>
              <Ionicons name="chevron-back" size={16} color="#71767b" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, value, onChange, placeholder, multiline, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; maxLength?: number;
}) {
  return (
    <View>
      <AppText style={{ color: "#71767b", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#444"
        multiline={multiline}
        maxLength={maxLength}
        style={{
          color: "#fff",
          fontSize: 15,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#1a1a1a",
          minHeight: multiline ? 60 : 36,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {maxLength && (
        <AppText style={{ color: "#444", fontSize: 10, marginTop: 2, textAlign: "left" }}>
          {value.length}/{maxLength}
        </AppText>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <AppText style={{ color: "#71767b", fontSize: 12 }}>{label}</AppText>
      <AppText style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{value}</AppText>
    </View>
  );
}
