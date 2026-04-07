import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../../api";

interface Plan {
  id: string;
  name: string;
  price: string;
  employees: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$9",
    employees: "10",
    features: ["10 employees", "Basic workspace", "Team management", "14-day free trial"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    employees: "50",
    features: ["50 employees", "Full workspace", "Projects & deals", "AI assistant", "14-day free trial"],
    popular: true,
  },
  {
    id: "pro_plus",
    name: "Pro Plus",
    price: "$79",
    employees: "200",
    features: ["200 employees", "Everything in Pro", "Advanced analytics", "Priority support", "14-day free trial"],
  },
];

export default function SubscriptionPlansScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [step, setStep] = useState<"plans" | "create">("plans");

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      // First check if user has a company
      const company = await apiFetch<{ id: number } | null>("/companies/me").catch(() => null);

      if (!company) {
        // Need to create a company first
        const name = `My Company`;
        await apiFetch("/companies", {
          method: "POST",
          body: JSON.stringify({ name, company_type: "startup", size: "1-10" }),
        });
      }

      // Now subscribe
      const res = await apiFetch<{ checkout_url: string }>("/companies/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      });

      if (res.checkout_url) {
        await Linking.openURL(res.checkout_url);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.status === 402) {
        Alert.alert(t("common.soon"), "Payment required");
      } else {
        Alert.alert(t("common.soon"), e?.message || "Something went wrong");
      }
    }
    setLoading(null);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 12,
        },
        backBtn: { padding: 4 },
        title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", flex: 1 },
        scroll: { padding: 16, paddingBottom: 100 },
        heroText: {
          color: colors.textPrimary,
          fontSize: 24,
          fontWeight: "900",
          textAlign: "center",
          marginBottom: 8,
        },
        heroSub: {
          color: colors.textMuted,
          fontSize: 14,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 20,
        },
        planCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          padding: 20,
          marginBottom: 16,
        },
        planCardPopular: {
          borderColor: colors.accent,
          borderWidth: 2,
        },
        popularBadge: {
          position: "absolute",
          top: -10,
          right: 16,
          backgroundColor: colors.accent,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 8,
        },
        popularText: { color: colors.white, fontSize: 11, fontWeight: "800" },
        planName: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
        planPrice: { color: colors.accent, fontSize: 32, fontWeight: "900", marginTop: 4 },
        planPeriod: { color: colors.textMuted, fontSize: 13 },
        planFeatures: { marginTop: 16, gap: 8 },
        featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        featureText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
        subscribeBtn: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginTop: 16,
        },
        subscribeBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
        enterpriseCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          padding: 20,
          alignItems: "center",
        },
        enterpriseText: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 8 },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("drawer.workspace")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroText}>{t("drawer.enterprise")}</Text>
        <Text style={styles.heroSub}>{t("services.integrationsHub")}</Text>

        {PLANS.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
            {plan.popular ? (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            ) : null}
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>
              {plan.price}
              <Text style={styles.planPeriod}> /mo</Text>
            </Text>
            <View style={styles.planFeatures}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.accentCyan} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.subscribeBtn}
              onPress={() => handleSubscribe(plan.id)}
              disabled={loading !== null}
            >
              {loading === plan.id ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.subscribeBtnText}>{t("auth.createAccount")}</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.enterpriseCard}>
          <Text style={styles.planName}>Enterprise</Text>
          <Text style={styles.enterpriseText}>200+ employees — contact us</Text>
        </View>
      </ScrollView>
    </View>
  );
}
