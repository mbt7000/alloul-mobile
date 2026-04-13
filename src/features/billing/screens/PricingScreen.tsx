/**
 * PricingScreen — ALLOUL&Q
 * Shows 3 plan tiers + Enterprise contact.
 */
import React, { useCallback, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { BRAND } from "../../../brand";
import {
  createCheckoutSession, PLANS, type PlanTier, type BillingPeriod,
} from "../../../api/billing.api";

export default function PricingScreen() {
  const nav = useNavigation<any>();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const handleSelect = useCallback(async (tier: PlanTier) => {
    setLoading(tier);
    try {
      const res = await createCheckoutSession(tier, period);
      await WebBrowser.openBrowserAsync(res.url);
    } catch (e: any) {
      Alert.alert("الاشتراك", e?.message || "تعذّر بدء الاشتراك");
    } finally {
      setLoading(null);
    }
  }, [period]);

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginRight: 12 }}>
            اختر خطتك
          </AppText>
        </View>

        <AppText style={{ color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6 }}>
          {BRAND.nameArabic}
        </AppText>
        <AppText style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
          منصة الأعمال الذكية — ابدأ مجاناً لمدة 14 يوم
        </AppText>

        {/* Period toggle */}
        <View style={{
          flexDirection: "row",
          backgroundColor: "#151515",
          borderRadius: 14,
          borderWidth: 1, borderColor: "#222",
          padding: 4,
          marginBottom: 24,
        }}>
          {(["monthly", "yearly"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                backgroundColor: period === p ? BRAND.colors.primary : "transparent",
              }}
            >
              <AppText style={{
                color: period === p ? "#fff" : "#888",
                fontSize: 13, fontWeight: "700",
              }}>
                {p === "monthly" ? "شهري" : "سنوي (خصم 17%)"}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Plan cards */}
        {(Object.keys(PLANS) as PlanTier[]).map((tier) => {
          const plan = PLANS[tier];
          const price = period === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const isPro = tier === "professional";
          const isLoading = loading === tier;
          return (
            <View
              key={tier}
              style={{
                backgroundColor: "#151515",
                borderRadius: 20,
                borderWidth: isPro ? 2 : 1,
                borderColor: isPro ? BRAND.colors.primary : "#222",
                padding: 20,
                marginBottom: 14,
              }}
            >
              {isPro && (
                <View style={{
                  position: "absolute", top: -10, right: 20,
                  backgroundColor: BRAND.colors.primary,
                  paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
                }}>
                  <AppText style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                    الأكثر شعبية
                  </AppText>
                </View>
              )}
              <AppText style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                {plan.nameAr}
              </AppText>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8 }}>
                <AppText style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>
                  ${price}
                </AppText>
                <AppText style={{ color: "#888", fontSize: 13, marginRight: 4 }}>
                  / {period === "monthly" ? "شهر" : "سنة"}
                </AppText>
              </View>
              {plan.trialDays > 0 && (
                <View style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#10b98122",
                  borderWidth: 1, borderColor: "#10b98144",
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                  marginTop: 6,
                }}>
                  <AppText style={{ color: "#10b981", fontSize: 10, fontWeight: "700" }}>
                    {plan.trialDays} أيام تجربة مجانية
                  </AppText>
                </View>
              )}
              <View style={{ marginTop: 14, gap: 8 }}>
                {plan.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={14} color={BRAND.colors.success} />
                    <AppText style={{ color: "#ddd", fontSize: 12 }}>{f}</AppText>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => void handleSelect(tier)}
                disabled={isLoading}
                style={{
                  marginTop: 18, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: isPro ? BRAND.colors.primary : "#fff",
                  alignItems: "center", justifyContent: "center",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color={isPro ? "#fff" : "#000"} />
                ) : (
                  <AppText style={{
                    color: isPro ? "#fff" : "#000",
                    fontSize: 14, fontWeight: "800",
                  }}>
                    اختر {plan.nameAr}
                  </AppText>
                )}
              </Pressable>
            </View>
          );
        })}

        {/* Enterprise */}
        <Pressable
          onPress={() => nav.navigate("EnterpriseContact")}
          style={{
            marginTop: 6,
            backgroundColor: "#151515",
            borderRadius: 20,
            borderWidth: 1, borderColor: "#222",
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Ionicons name="business" size={20} color={BRAND.colors.accent} />
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              Enterprise
            </AppText>
          </View>
          <AppText style={{ color: "#888", fontSize: 12, lineHeight: 18 }}>
            لأكثر من 32 موظف · تخصيصات · اتفاقية SLA · دعم مخصص
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <AppText style={{ color: BRAND.colors.accent, fontSize: 12, fontWeight: "700" }}>
              تواصل معنا
            </AppText>
            <Ionicons name="chevron-back" size={14} color={BRAND.colors.accent} />
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
