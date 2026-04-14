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

  // Brand colors — extracted from the ALLOUL&Q logo (blue A → green Q)
  colors: {
    // Primary palette — from the logo
    primary: "#2E8BFF",      // Logo blue (the "A") — main CTA
    secondary: "#14E0A4",    // Logo green (the "Q") — success, confirmations
    accent: "#00D4FF",       // Logo lens cyan — highlights, pulse effects
    success: "#14E0A4",
    warning: "#F5A623",
    error:   "#FF4757",
    info:    "#00D4FF",

    // Backgrounds — dual theme
    darkBg:      "#050810",  // Deep space (behind the logo)
    darkBgAlt:   "#0A0F1A",  // Slightly elevated dark surface
    darkCard:    "#0F1626",  // Card background
    darkCardAlt: "#131B2E",  // Hover/elevated card
    darkBorder:  "rgba(46,139,255,0.12)",
    darkBorderStrong: "rgba(46,139,255,0.22)",

    // Glassy theme (lighter variant matching logo style)
    glassBg:      "#0B1220",
    glassCard:    "rgba(46,139,255,0.05)",
    glassCardAlt: "rgba(20,224,164,0.04)",
    glassBorder:  "rgba(255,255,255,0.08)",

    // Text
    textPrimary:   "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.72)",
    textMuted:     "rgba(255,255,255,0.42)",

    // Gradients — from the logo itself
    gradientLogo:    ["#2E8BFF", "#14E0A4"] as const, // A → Q (blue → green)
    gradientPrimary: ["#2E8BFF", "#1E6BE0"] as const,
    gradientAccent:  ["#00D4FF", "#2E8BFF"] as const,
    gradientGreen:   ["#14E0A4", "#0AA578"] as const,
    gradientDark:    ["#050810", "#0F1626"] as const,
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
