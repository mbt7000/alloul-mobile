/**
 * CompanyEditServicesScreen
 * ─────────────────────────
 * Lets user pick which services appear in their quick-access grid.
 * Stored locally via AsyncStorage — no backend changes.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";

const STORAGE_KEY = "company_quick_services_v1";
const MAX_SLOTS = 6;

interface Service {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  category: string;
  color: string;
}

const ALL_SERVICES: Service[] = [
  // Work
  { key: "projects",  icon: "folder",          label: "المشاريع",  category: "العمل",         color: "#06b6d4" },
  { key: "tasks",     icon: "checkmark-done",  label: "المهام",    category: "العمل",         color: "#3b82f6" },
  { key: "handover",  icon: "swap-horizontal", label: "التسليم",   category: "العمل",         color: "#f59e0b" },
  { key: "files",     icon: "folder-open",     label: "الملفات",   category: "العمل",         color: "#a855f7" },
  // Communication
  { key: "meet",      icon: "videocam",        label: "اجتماعات",  category: "التواصل",       color: "#10b981" },
  { key: "chat",      icon: "chatbubbles",     label: "الدردشة",   category: "التواصل",       color: "#0ea5e9" },
  { key: "team",      icon: "people",          label: "الفريق",    category: "التواصل",       color: "#8b5cf6" },
  { key: "feed",      icon: "newspaper",       label: "الأخبار",   category: "التواصل",       color: "#ef4444" },
  // Management
  { key: "crm",       icon: "trending-up",     label: "العملاء",   category: "الإدارة",       color: "#ec4899" },
  { key: "reports",   icon: "bar-chart",       label: "التقارير",  category: "الإدارة",       color: "#f59e0b" },
  { key: "knowledge", icon: "book",            label: "المعرفة",   category: "الإدارة",       color: "#8b5cf6" },
  { key: "roles",     icon: "key",             label: "الأدوار",   category: "الإدارة",       color: "#10b981" },
  // AI
  { key: "ai",        icon: "sparkles",        label: "المساعد",   category: "الذكاء",        color: "#a855f7" },
  { key: "search",    icon: "search",          label: "البحث",     category: "الذكاء",        color: "#06b6d4" },
];

const DEFAULT_KEYS = ["meet", "tasks", "team", "chat", "projects", "ai"];

export default function CompanyEditServicesScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [selected, setSelected] = useState<string[]>(DEFAULT_KEYS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setSelected(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= MAX_SLOTS) return prev;
      return [...prev, key];
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setSaving(false);
    nav.goBack();
  }, [selected, nav]);

  // Group all services by category
  const byCategory: Record<string, Service[]> = {};
  ALL_SERVICES.forEach((s) => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  const selectedServices = selected
    .map(k => ALL_SERVICES.find(s => s.key === k))
    .filter((s): s is Service => !!s);

  const emptySlots = Math.max(0, MAX_SLOTS - selectedServices.length);

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>تعديل الخدمات</AppText>
            <AppText style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
              اختر {MAX_SLOTS} خدمات للوصول السريع
            </AppText>
          </View>
        </View>

        {/* ── Selected Services ── */}
        <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
          الخدمات النشطة ({selected.length}/{MAX_SLOTS})
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {selectedServices.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => toggle(s.key)}
              style={{
                width: "30%",
                backgroundColor: "#151515",
                borderRadius: 16,
                borderWidth: 1.5, borderColor: s.color,
                padding: 14, alignItems: "center",
                position: "relative",
              }}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: `${s.color}22`,
                alignItems: "center", justifyContent: "center",
                marginBottom: 8,
              }}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "600", textAlign: "center" }}>
                {s.label}
              </AppText>
              {/* Remove indicator */}
              <View style={{
                position: "absolute", top: 6, right: 6,
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: "#ef4444",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="remove" size={12} color="#fff" />
              </View>
            </Pressable>
          ))}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <View
              key={`empty-${i}`}
              style={{
                width: "30%",
                backgroundColor: "#0f0f0f",
                borderRadius: 16,
                borderWidth: 1.5, borderColor: "#222",
                borderStyle: "dashed",
                padding: 14, alignItems: "center",
                minHeight: 88,
                justifyContent: "center",
              }}
            >
              <Ionicons name="add-outline" size={20} color="#444" />
              <AppText style={{ color: "#555", fontSize: 10, marginTop: 4 }}>فارغ</AppText>
            </View>
          ))}
        </View>

        {/* ── All Services ── */}
        <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
          جميع الخدمات
        </AppText>
        {Object.entries(byCategory).map(([cat, items]) => (
          <View key={cat} style={{ marginBottom: 20 }}>
            <AppText style={{ color: "#888", fontSize: 11, fontWeight: "600", marginBottom: 8 }}>
              {cat}
            </AppText>
            <View style={{ gap: 8 }}>
              {items.map((s) => {
                const isSelected = selected.includes(s.key);
                const canAdd = !isSelected && selected.length < MAX_SLOTS;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => { if (isSelected || canAdd) toggle(s.key); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      backgroundColor: "#151515",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? s.color : "#222",
                      padding: 12,
                      opacity: !isSelected && !canAdd ? 0.4 : 1,
                    }}
                  >
                    <View style={{
                      width: 38, height: 38, borderRadius: 11,
                      backgroundColor: `${s.color}22`,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name={s.icon} size={18} color={s.color} />
                    </View>
                    <AppText style={{ flex: 1, color: "#fff", fontSize: 13, fontWeight: "600" }}>
                      {s.label}
                    </AppText>
                    <View style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: isSelected ? s.color : "#222",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons
                        name={isSelected ? "checkmark" : "add"}
                        size={16}
                        color="#fff"
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Sticky Save Button ── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, paddingBottom: 30,
        backgroundColor: "#0b0b0b",
        borderTopWidth: 1, borderTopColor: "#1a1a1a",
      }}>
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={{
            backgroundColor: c.accentCyan,
            paddingVertical: 16, borderRadius: 16,
            alignItems: "center",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
