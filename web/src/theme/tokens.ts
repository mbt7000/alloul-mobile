/**
 * ALLOUL&Q Web Design Tokens
 * ---------------------------
 * Mirrors the mobile theme (src/theme/tokens.ts) so both platforms share
 * the same visual language. Exported as plain JS objects and consumed via
 * Tailwind classes + inline styles when needed.
 */

export const colors = {
  // Brand — from the real logo
  primary:   { 500: '#2E8BFF', 600: '#1E6BE0', 700: '#1955B8' },
  secondary: { 500: '#14E0A4', 600: '#0AA578', 700: '#087A58' },
  accent:    { 500: '#00D4FF', 600: '#00A6CC', 700: '#007999' },

  // Deep space background
  bg: { 900: '#050810', 800: '#0F1626', 700: '#131B2E', 600: '#1A2440' },

  // Semantic
  success: '#14E0A4',
  warning: '#FFB24D',
  danger:  '#FF4757',

  // Text
  text: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.72)', muted: 'rgba(255,255,255,0.52)' },

  // Glass borders/surfaces
  glass: {
    border:       'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.15)',
    surface:      'rgba(255, 255, 255, 0.04)',
    surfaceStrong:'rgba(255, 255, 255, 0.07)',
  },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 9999,
} as const;

export const typography = {
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32, display: 48 },
  fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.2, base: 1.5, relaxed: 1.75 },
} as const;

export const shadows = {
  glowPrimary:   '0 0 40px rgba(46,139,255,0.35)',
  glowSecondary: '0 0 40px rgba(20,224,164,0.35)',
  glowAccent:    '0 0 40px rgba(0,212,255,0.35)',
  cardSoft:      '0 8px 32px rgba(0,0,0,0.35)',
  cardDeep:      '0 20px 60px rgba(0,0,0,0.50)',
} as const;

export const gradients = {
  logo:    'linear-gradient(135deg, #2E8BFF 0%, #14E0A4 100%)',
  primary: 'linear-gradient(135deg, #2E8BFF 0%, #1E6BE0 100%)',
  accent:  'linear-gradient(135deg, #00D4FF 0%, #2E8BFF 100%)',
  dark:    'linear-gradient(180deg, #050810 0%, #0F1626 100%)',
  aiOrb:   'conic-gradient(from 180deg at 50% 50%, #2E8BFF, #00D4FF, #14E0A4, #2E8BFF)',
} as const;

export const duration = {
  fast: 150, normal: 250, slow: 400, slower: 600,
} as const;

/**
 * Glass class presets — string constants matching the CSS in globals.css.
 * Use these instead of repeating the long backdrop-blur Tailwind soup.
 */
export const glass = {
  card:    'glass glass-hover',
  strong:  'glass-strong',
  chrome:  'glass-chrome',
  subtle:  'glass-subtle',
  ringPrimary:   'glass glass-ring-primary',
  ringAccent:    'glass glass-ring-accent',
  ringSecondary: 'glass glass-ring-secondary',
} as const;

const tokens = { colors, spacing, radius, typography, shadows, gradients, duration, glass };
export default tokens;
