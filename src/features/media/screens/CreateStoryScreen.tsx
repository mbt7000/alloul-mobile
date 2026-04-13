import React, { useEffect, useRef, useState } from "react";
import {
  View, Image, Pressable, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { createStory } from "../../../api/stories.api";
import { apiFetch } from "../../../api/client";

export default function CreateStoryScreen() {
  const nav = useNavigation();
  const { colors } = useAppTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const autoLaunched = useRef(false);

  const pickImage = async (source: "camera" | "gallery", videoToo = false) => {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: videoToo ? "videos" : "images",
      quality: 0.8,
      allowsEditing: true,
      aspect: [9, 16],
      videoMaxDuration: 15,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("تحتاج إذن الكاميرا"); nav.goBack(); return; }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("تحتاج إذن المعرض"); return; }
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    } else if (source === "camera" && autoLaunched.current) {
      // User cancelled camera → go back
      nav.goBack();
    }
  };

  // Auto-launch camera on mount (Snapchat-style)
  useEffect(() => {
    if (!autoLaunched.current) {
      autoLaunched.current = true;
      void pickImage("camera");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async () => {
    if (!imageUri) return;
    setUploading(true);
    try {
      // Upload image first
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "story.jpg";
      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: "image/jpeg",
      } as any);

      const uploadRes = await apiFetch<{ url: string }>("/upload/image", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" } as any,
        body: formData as any,
      });

      // Create story with uploaded URL
      await createStory({
        media_url: uploadRes.url,
        media_type: "image",
        caption: caption.trim() || null,
      });

      nav.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", "تعذّر رفع الصورة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0a0a0f" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <AppText variant="body" weight="bold" style={{ color: "#fff" }}>
            إنشاء قصة
          </AppText>
          <View style={{ width: 26 }} />
        </View>

        {/* Preview area */}
        <View style={styles.previewArea}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.emptyPreview}>
              <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.2)" />
              <AppText variant="body" tone="muted" style={{ marginTop: 12 }}>
                اختر صورة لقصتك
              </AppText>
            </View>
          )}
        </View>

        {/* Caption input */}
        {imageUri && (
          <View style={styles.captionRow}>
            <Ionicons name="text-outline" size={18} color="rgba(255,255,255,0.5)" />
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="أضف نص للقصة..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.captionInput}
              textAlign="right"
              maxLength={200}
            />
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {!imageUri ? (
            <View style={styles.sourceRow}>
              {/* Camera: tap = photo, hold = video (Snapchat-style) */}
              <Pressable
                style={styles.sourceBtn}
                onPress={() => pickImage("camera", false)}
                onLongPress={() => pickImage("camera", true)}
                delayLongPress={400}
              >
                <View style={[styles.sourceBtnIcon, { backgroundColor: "#0ea5e922" }]}>
                  <Ionicons name="camera" size={28} color="#0ea5e9" />
                </View>
                <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>الكاميرا</AppText>
                <AppText style={{ color: "#71767b", fontSize: 10, marginTop: 2 }}>
                  اضغط: صورة · اضغط طويلاً: فيديو
                </AppText>
              </Pressable>
              <Pressable style={styles.sourceBtn} onPress={() => pickImage("gallery")}>
                <View style={[styles.sourceBtnIcon, { backgroundColor: "#a855f722" }]}>
                  <Ionicons name="images" size={28} color="#a855f7" />
                </View>
                <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>المعرض</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.publishRow}>
              <Pressable
                style={styles.changeBtn}
                onPress={() => { setImageUri(null); setCaption(""); }}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <AppText variant="bodySm" style={{ color: "#fff" }}>تغيير</AppText>
              </Pressable>
              <Pressable
                style={[styles.publishBtn, uploading && { opacity: 0.6 }]}
                onPress={handlePublish}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>نشر القصة</AppText>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  previewArea: {
    flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  previewImage: { width: "100%", height: "100%" },
  emptyPreview: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  captionRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  captionInput: {
    flex: 1, color: "#fff", fontSize: 14, paddingVertical: 0,
  },
  actions: { paddingHorizontal: 16, paddingVertical: 16 },
  sourceRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
  sourceBtn: { alignItems: "center", gap: 8 },
  sourceBtnIcon: {
    width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  publishRow: { flexDirection: "row", gap: 12 },
  changeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  publishBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 16, backgroundColor: "#0ea5e9",
  },
});
