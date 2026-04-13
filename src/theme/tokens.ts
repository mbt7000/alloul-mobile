/**
 * ALLOUL&Q — Design Tokens
 * Single source of truth for spacing, radii, typography, effects.
 *
 * Colors live in `BRAND.colors` (src/brand/index.ts).
 * Theme-dependent colors (bg, text) are in ThemeContext.
 */

// ─── Spacing (8px grid) ──────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const fonts = {
  // System — falls back to SF Pro / Roboto
  regular: undefined as string | undefined,
  medium: undefined as string | undefined,
  bold: undefined as string | undefined,
  // Arabic: uses the system Arabic font (SF Arabic / Noto Sans Arabic)
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: "900" as const, lineHeight: 40, letterSpacing: -0.5 },
  h1:      { fontSize: 28, fontWeight: "800" as const, lineHeight: 34, letterSpacing: -0.3 },
  h2:      { fontSize: 22, fontWeight: "800" as const, lineHeight: 28 },
  h3:      { fontSize: 18, fontWeight: "700" as const, lineHeight: 24 },
  h4:      { fontSize: 16, fontWeight: "700" as const, lineHeight: 22 },
  body:    { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyBold:{ fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  micro:   { fontSize: 11, fontWeight: "500" as const, lineHeight: 15 },
  button:  { fontSize: 15, fontWeight: "700" as const, lineHeight: 20, letterSpacing: 0.2 },
} as const;

// ─── Effects (shadows, glows) ────────────────────────────────────────────────

export const effects = {
  shadowSm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  glowPrimary: {
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// ─── Durations (animations) ──────────────────────────────────────────────────

export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  xslow: 600,
} as const;

// ─── Z-index ─────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  modal: 1000,
  toast: 2000,
  tooltip: 3000,
  callOverlay: 9999,
} as const;
