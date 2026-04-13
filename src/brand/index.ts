/**
 * ALLOUL&Q — Brand constants
 * Single source of truth for product name, colors, and logo assets.
 *
 * Usage:
 *   import { BRAND } from "@/brand";
 *   <AppText>{BRAND.name}</AppText>
 *   <Image source={BRAND.logos.dark} />
 */

export const BRAND = {
  // Product identity
  name: "ALLOUL&Q",
  nameArabic: "اللول&Q",
  tagline: "The Smart Business Platform",
  taglineArabic: "منصة الأعمال الذكية",
  shortDescription: "AI-powered workspace for modern teams",
  shortDescriptionArabic: "مساحة عمل ذكية للفرق الحديثة",
  domain: "alloul.app",
  supportEmail: "support@alloul.app",
  noreplyEmail: "noreply@alloul.app",

  // Brand colors (ALLOUL&Q palette)
  colors: {
    primary: "#0066FF",      // ALLOUL Blue — main CTA
    secondary: "#10B981",    // Success green — confirmations
    accent: "#8B5CF6",       // Premium purple — highlights
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#06B6D4",

    // Gradients
    gradientPrimary: ["#0066FF", "#0052CC"] as const,
    gradientAccent: ["#8B5CF6", "#6D28D9"] as const,
    gradientSuccess: ["#10B981", "#059669"] as const,
  },

  // Logo assets — stored in assets/logo/
  // Files: alloul-logo-dark.png, alloul-logo-light.png,
  //        alloul-icon-only.png, alloul-wordmark.svg
  logos: {
    dark: require("../../assets/logo/alloul-logo-dark.png"),
    light: require("../../assets/logo/alloul-logo-light.png"),
    iconOnly: require("../../assets/logo/alloul-icon-only.png"),
  },

  // Social handles
  social: {
    twitter: "@allouland_q",
    linkedin: "company/allouland-q",
    instagram: "@allouland_q",
  },

  // Legal
  legal: {
    company: "Alloul Digital",
    foundedYear: 2026,
    copyright: "© 2026 Alloul Digital. All rights reserved.",
    copyrightArabic: "© 2026 الول ديجيتال. جميع الحقوق محفوظة.",
  },
} as const;

export type BrandColors = typeof BRAND.colors;
