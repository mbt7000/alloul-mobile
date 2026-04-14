/**
 * ALLOUL&Q — Billing API (wires to /companies/* — the canonical Stripe
 * integration used by Cowork and the production backend).
 *
 * Plan IDs match Stripe Dashboard:
 *   starter  → prod_UB8zDoyn2YPFFY ($24/mo)
 *   pro      → prod_UB90ckEsKlawsj ($59/mo)
 *   pro_plus → prod_UB91gU3Z32gHKq ($289/mo)
 */
import { apiFetch } from "./client";

export type PlanTier = "starter" | "pro" | "pro_plus" | "enterprise";

export interface StripeConfig {
  publishable_key: string;
  plans: {
    starter: { price_id: string; amount: number; employees: number };
    pro: { price_id: string; amount: number; employees: number };
    pro_plus: { price_id: string; amount: number; employees: number };
  };
}

export interface SubscriptionStatus {
  plan_id: PlanTier | "admin" | null;
  status: "active" | "trialing" | "past_due" | "canceled" | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

export interface SubscribeResponse {
  checkout_url: string;
}

// ─── Endpoints (ALL hitting /companies/* — the canonical ones) ──────────────

export const getStripeConfig = () =>
  apiFetch<StripeConfig>("/companies/stripe-config");

export const subscribe = (plan_id: PlanTier) =>
  apiFetch<SubscribeResponse>("/companies/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan_id }),
  });

export const getSubscriptionStatus = () =>
  apiFetch<SubscriptionStatus>("/companies/subscription-status");

export const cancelSubscription = () =>
  apiFetch<{ message: string }>("/companies/cancel-subscription", {
    method: "POST",
  });

// ─── Plan metadata (matches Stripe Dashboard exactly) ──────────────────────

export const PLANS: Record<
  Exclude<PlanTier, "enterprise">,
  {
    nameEn: string;
    nameAr: string;
    monthlyPriceUsd: number;
    employeeLimit: number;
    trialDays: number;
    features: string[];
    accentColor: string;
  }
> = {
  starter: {
    nameEn: "Starter",
    nameAr: "المبتدئ",
    monthlyPriceUsd: 24,
    employeeLimit: 5,
    trialDays: 14,
    accentColor: "#2E8BFF",
    features: [
      "حتى 5 موظفين",
      "Media World كامل",
      "Corporate World أساسي",
      "10GB تخزين",
      "AI محدود (50/شهر)",
      "دعم إيميل",
      "iOS + Android",
    ],
  },
  pro: {
    nameEn: "Pro",
    nameAr: "الاحترافي",
    monthlyPriceUsd: 59,
    employeeLimit: 21,
    trialDays: 14,
    accentColor: "#14E0A4",
    features: [
      "كل ميزات Starter",
      "حتى 21 موظف",
      "Corporate World كامل",
      "50GB تخزين",
      "AI (500/شهر)",
      "مكالمات فيديو",
      "دعم أولوية",
    ],
  },
  pro_plus: {
    nameEn: "Pro Plus",
    nameAr: "الاحترافي المتقدم",
    monthlyPriceUsd: 289,
    employeeLimit: 33,
    trialDays: 14,
    accentColor: "#00D4FF",
    features: [
      "كل ميزات Pro",
      "حتى 33 موظف",
      "AI غير محدود",
      "200GB تخزين",
      "API access",
      "دعم VIP 24/7",
      "تقارير متقدمة",
    ],
  },
};
