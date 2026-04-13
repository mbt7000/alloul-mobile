/**
 * BillingScreen — manage current subscription
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { BRAND } from "../../../brand";
import {
  getSubscription, cancelSubscription, createPortalSession,
  type SubscriptionInfo,
} from "../../../api/billing.api";

export default function BillingScreen() {
  const nav = useNavigation<any>();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getSubscription();
      setSub(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handlePortal = async () => {
    try {
      const res = await createPortalSession();
      await WebBrowser.openBrowserAsync(res.url);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر فتح بوابة الإدارة");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "إلغاء الاشتراك",
      "سيستمر الوصول حتى نهاية الفترة الحالية. هل تريد المتابعة؟",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إلغاء الاشتراك",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription();
              await load();
            } catch (e: any) {
              Alert.alert("خطأ", e?.message || "فشل الإلغاء");
            }
          },
        },
      ],
    );
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginRight: 12 }}>
            الفوترة والاشتراك
          </AppText>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.colors.primary} style={{ marginTop: 40 }} />
        ) : sub?.status === "none" || !sub?.tier ? (
          <View style={{
            backgroundColor: "#151515",
            borderRadius: 18,
            borderWidth: 1, borderColor: "#222",
            padding: 24, alignItems: "center",
          }}>
            <Ionicons name="gift-outline" size={48} color={BRAND.colors.primary} />
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 12 }}>
              لا يوجد اشتراك فعّال
            </AppText>
            <AppText style={{ color: "#888", fontSize: 12, marginTop: 6, textAlign: "center" }}>
              ابدأ تجربتك المجانية مع ALLOUL&Q
            </AppText>
            <Pressable
              onPress={() => nav.navigate("Pricing")}
              style={{
                marginTop: 20,
                backgroundColor: BRAND.colors.primary,
                paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
              }}
            >
              <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
                عرض الخطط
              </AppText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Current plan card */}
            <View style={{
              backgroundColor: "#151515",
              borderRadius: 18,
              borderWidth: 1.5, borderColor: BRAND.colors.primary,
              padding: 20, marginBottom: 16,
            }}>
              <AppText style={{ color: "#888", fontSize: 11, fontWeight: "700" }}>
                الخطة الحالية
              </AppText>
              <AppText style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 }}>
                {sub.tier?.toUpperCase()}
              </AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: sub.status === "active" ? BRAND.colors.success :
                                   sub.status === "trialing" ? BRAND.colors.warning :
                                   BRAND.colors.error,
                }} />
                <AppText style={{ color: "#ddd", fontSize: 12 }}>
                  {sub.status === "active" ? "فعّال" :
                   sub.status === "trialing" ? "فترة تجربة" :
                   sub.status === "past_due" ? "متأخر الدفع" : sub.status}
                </AppText>
              </View>
              {sub.current_period_end && (
                <AppText style={{ color: "#888", fontSize: 11, marginTop: 8 }}>
                  {sub.cancel_at_period_end ? "ينتهي في" : "التجديد التالي"}: {" "}
                  {new Date(sub.current_period_end).toLocaleDateString("ar")}
                </AppText>
              )}
              <AppText style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                حد الموظفين: {sub.employee_limit}
              </AppText>
            </View>

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <Pressable onPress={() => nav.navigate("Pricing")} style={actionStyle}>
                <Ionicons name="trending-up" size={18} color={BRAND.colors.primary} />
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 }}>
                  ترقية الخطة
                </AppText>
                <Ionicons name="chevron-back" size={16} color="#71767b" />
              </Pressable>

              <Pressable onPress={() => nav.navigate("Invoices")} style={actionStyle}>
                <Ionicons name="document-text-outline" size={18} color={BRAND.colors.info} />
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 }}>
                  الفواتير السابقة
                </AppText>
                <Ionicons name="chevron-back" size={16} color="#71767b" />
              </Pressable>

              <Pressable onPress={handlePortal} style={actionStyle}>
                <Ionicons name="card-outline" size={18} color={BRAND.colors.accent} />
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 }}>
                  إدارة طريقة الدفع
                </AppText>
                <Ionicons name="chevron-back" size={16} color="#71767b" />
              </Pressable>

              {!sub.cancel_at_period_end && (
                <Pressable onPress={handleCancel} style={actionStyle}>
                  <Ionicons name="close-circle-outline" size={18} color={BRAND.colors.error} />
                  <AppText style={{ color: BRAND.colors.error, fontSize: 14, fontWeight: "600", flex: 1, marginRight: 12 }}>
                    إلغاء الاشتراك
                  </AppText>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const actionStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
  backgroundColor: "#151515",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#222",
  padding: 16,
};
