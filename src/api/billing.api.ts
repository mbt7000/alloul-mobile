/**
 * ALLOUL&Q — Billing API (Stripe)
 */
import { apiFetch } from "./client";

export type PlanTier = "starter" | "professional" | "business";
export type BillingPeriod = "monthly" | "yearly";

export interface SubscriptionInfo {
  status: string; // "active" | "trialing" | "past_due" | "canceled" | "none"
  tier: PlanTier | null;
  billing_period: BillingPeriod | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  employee_limit: number;
}

export interface CheckoutResponse {
  session_id: string;
  url: string;
}

export interface InvoiceRow {
  id: string;
  number: string | null;
  status: string;
  amount_paid: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export const createCheckoutSession = (
  tier: PlanTier,
  billing_period: BillingPeriod = "monthly",
) =>
  apiFetch<CheckoutResponse>("/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ tier, billing_period }),
  });

export const createPortalSession = () =>
  apiFetch<{ url: string }>("/billing/portal-session", { method: "POST" });

export const getSubscription = () =>
  apiFetch<SubscriptionInfo>("/billing/subscription");

export const cancelSubscription = () =>
  apiFetch<{ ok: boolean; cancel_at: number }>("/billing/cancel", { method: "POST" });

export const upgradeSubscription = (tier: PlanTier, billing_period: BillingPeriod = "monthly") =>
  apiFetch<{ ok: boolean; tier: PlanTier }>("/billing/upgrade", {
    method: "POST",
    body: JSON.stringify({ tier, billing_period }),
  });

export const listInvoices = (limit = 20) =>
  apiFetch<{ invoices: InvoiceRow[] }>(`/billing/invoices?limit=${limit}`);

// ─── Plan metadata (mirrors backend PLAN_TIERS) ─────────────────────────────

export const PLANS: Record<PlanTier, {
  name: string;
  nameAr: string;
  monthlyPrice: number;
  yearlyPrice: number;
  employeeLimit: number;
  trialDays: number;
  features: string[];
}> = {
  starter: {
    name: "Starter",
    nameAr: "المبتدئ",
    monthlyPrice: 30,
    yearlyPrice: 300,
    employeeLimit: 5,
    trialDays: 14,
    features: [
      "حتى 5 موظفين",
      "إدارة المهام والمشاريع",
      "الاجتماعات والتسليم",
      "AI Assistant أساسي",
      "تجربة مجانية 14 يوم",
    ],
  },
  professional: {
    name: "Professional",
    nameAr: "الاحترافي",
    monthlyPrice: 90,
    yearlyPrice: 900,
    employeeLimit: 15,
    trialDays: 0,
    features: [
      "حتى 15 موظف",
      "كل ميزات المبتدئ",
      "تقارير متقدمة",
      "AI Assistant متقدم",
      "دعم أولوية",
    ],
  },
  business: {
    name: "Business",
    nameAr: "الأعمال",
    monthlyPrice: 210,
    yearlyPrice: 2100,
    employeeLimit: 32,
    trialDays: 0,
    features: [
      "حتى 32 موظف",
      "كل ميزات الاحترافي",
      "API access",
      "Custom integrations",
      "دعم VIP 24/7",
    ],
  },
};
