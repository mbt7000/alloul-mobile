/**
 * handlePlanError — call after a failed API request.
 * If the error is HTTP 402, show an upgrade alert; otherwise re-throw.
 */
import { Alert } from "react-native";

export interface ApiError {
  message?: string;
  status?: number;
}

export function handlePlanError(err: unknown, navigation?: any): boolean {
  const e = err as ApiError;
  if (e?.status === 402) {
    Alert.alert(
      "ترقية مطلوبة 🚀",
      e.message || "هذه الميزة غير متاحة في خطتك الحالية. رقّ خطتك للوصول.",
      [
        { text: "لاحقاً", style: "cancel" },
        ...(navigation
          ? [
              {
                text: "عرض الخطط",
                onPress: () => navigation.navigate("SubscriptionPlans"),
              },
            ]
          : []),
      ]
    );
    return true; // handled
  }
  return false; // not a plan error — caller should handle
}
