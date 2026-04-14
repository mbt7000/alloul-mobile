/**
 * ALLOUL&Q — color palettes
 * Colors extracted from the real logo (blue A → green Q gradient on deep space background).
 */

export type AppPalette = {
  brandDeepBlue: string;
  brandSurface: string;
  brandNeonBlue: string;
  brandPrimaryBlue: string;
  bg: string;
  bgPureBlack: string;
  mediaCanvas: string;
  bgSurface: string;
  bgCard: string;
  bgCardStrong: string;
  cardElevated: string;
  floatingBarBg: string;
  floatingBarBorder: string;
  floatingActiveFill: string;
  floatingActiveBorder: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentCobalt: string;
  accentBlue: string;
  accentCyan: string;
  accentTeal: string;
  accentEmerald: string;
  accentLime: string;
  accentNeonGreen: string;
  accentEmber: string;
  accentRose: string;
  primary: string;
  accentNeon: string;
  surface: string;
  card: string;
  cardStrong: string;
  white: string;
  black: string;
  success: string;
  danger: string;
  warning: string;
};

// ─── DARK theme — pure black, used by "Black" variant ───────────────────────

export const darkColors: AppPalette = {
  brandDeepBlue: "#050810",
  brandSurface: "#0A0F1A",
  brandNeonBlue: "#00D4FF",
  brandPrimaryBlue: "#2E8BFF",
  bg: "#050810",
  bgPureBlack: "#000000",
  mediaCanvas: "#000000",
  bgSurface: "#0A0F1A",
  bgCard: "#0F1626",
  bgCardStrong: "#131B2E",
  cardElevated: "#131B2E",
  floatingBarBg: "rgba(15,22,38,0.92)",
  floatingBarBorder: "rgba(46,139,255,0.16)",
  floatingActiveFill: "#2E8BFF",
  floatingActiveBorder: "rgba(46,139,255,0.4)",
  border: "rgba(46,139,255,0.14)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.42)",
  // Primary = logo blue (the "A")
  accent: "#2E8BFF",
  accentCobalt: "#1E6BE0",
  accentBlue: "#2E8BFF",
  accentCyan: "#00D4FF",          // Logo lens cyan
  accentTeal: "#14E0A4",          // Logo green (the "Q")
  accentEmerald: "#14E0A4",
  accentLime: "#8AFFC8",
  accentNeonGreen: "#14E0A4",
  accentEmber: "#FFB24D",
  accentRose: "#FF4757",
  primary: "#2E8BFF",
  accentNeon: "#00D4FF",
  surface: "#0A0F1A",
  card: "#0F1626",
  cardStrong: "#131B2E",
  white: "#FFFFFF",
  black: "#000000",
  success: "#14E0A4",
  danger: "#FF4757",
  warning: "#FFB24D",
};

// ─── LIGHT theme — glassy, subtle, matches logo colors softly ──────────────

export const lightColors: AppPalette = {
  brandDeepBlue: "#E8F1FF",
  brandSurface: "#F5F9FF",
  brandNeonBlue: "#00A8CC",
  brandPrimaryBlue: "#2E8BFF",
  bg: "#F5F9FF",
  bgPureBlack: "#FFFFFF",
  mediaCanvas: "#FFFFFF",
  bgSurface: "#EEF4FC",
  bgCard: "rgba(46,139,255,0.05)",
  bgCardStrong: "rgba(46,139,255,0.08)",
  cardElevated: "#FFFFFF",
  floatingBarBg: "rgba(255,255,255,0.94)",
  floatingBarBorder: "rgba(46,139,255,0.22)",
  floatingActiveFill: "#2E8BFF",
  floatingActiveBorder: "rgba(46,139,255,0.45)",
  border: "rgba(46,139,255,0.12)",
  textPrimary: "#0A1322",
  textSecondary: "#3C4A63",
  textMuted: "#6A7791",
  accent: "#2E8BFF",
  accentCobalt: "#1E6BE0",
  accentBlue: "#2E8BFF",
  accentCyan: "#00A8CC",
  accentTeal: "#0AA578",
  accentEmerald: "#0AA578",
  accentLime: "#65A30D",
  accentNeonGreen: "#0AA578",
  accentEmber: "#EA580C",
  accentRose: "#E11D48",
  primary: "#2E8BFF",
  accentNeon: "#00A8CC",
  surface: "#EEF4FC",
  card: "rgba(46,139,255,0.05)",
  cardStrong: "rgba(46,139,255,0.08)",
  white: "#FFFFFF",
  black: "#000000",
  success: "#0AA578",
  danger: "#E11D48",
  warning: "#D97706",
};

// ─── Gradients (logo A → Q direction) ──────────────────────────────────────

export const gradients = {
  logo:      ["#2E8BFF", "#14E0A4"] as const, // blue A → green Q
  accent:    ["#2E8BFF", "#00D4FF"] as const, // blue → cyan
  media:     ["#2E8BFF", "#14E0A4"] as const,
  workspace: ["#14E0A4", "#2E8BFF"] as const,
  flare:     ["#00D4FF", "#14E0A4"] as const,
};

export type ThemeMode = "light" | "dark";
