// ─── Continuum AI — "Living Health OS" Typography ───────────────────────────
// System fonts for everything (feels native and fast).
// Syne ExtraBold reserved for brand hero moments only (score, key callouts).

import { Platform } from 'react-native';

export const FontFamily = {
  // ── System font stack — feels native on every platform ────────────────────
  // iOS: SF Pro | Android: Roboto | Web: SF Pro / system-ui
  system: Platform.select({
    ios: undefined,          // undefined = system default (SF Pro)
    android: 'sans-serif',   // Roboto
    default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  }) as string | undefined,

  // ── Brand moments only ────────────────────────────────────────────────────
  // Hero numbers, health score, key callouts — ONE differentiator
  brand: 'Syne_800ExtraBold',
  brandBold: 'Syne_700Bold',

  // ── Syne — kept for backward compatibility ────────────────────────────────
  displayRegular: 'Syne_400Regular',
  displayMedium: 'Syne_500Medium',
  displaySemiBold: 'Syne_600SemiBold',
  displayBold: 'Syne_700Bold',
  displayExtraBold: 'Syne_800ExtraBold',

  // ── Inter — kept for backward compatibility ───────────────────────────────
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  // ── Legacy convenience aliases ────────────────────────────────────────────
  display: 'Syne_700Bold',
  bodySemiBoldLegacy: 'Inter_600SemiBold',
} as const;

// ── Apple type scale — use these sizes throughout new screens ────────────────
// (matches iOS Human Interface Guidelines)
export const AppleType = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  title1:     { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  title2:     { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0 },
  title3:     { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0 },
  headline:   { fontSize: 17, fontWeight: '600' as const, letterSpacing: 0 },
  body:       { fontSize: 17, fontWeight: '400' as const, letterSpacing: 0 },
  callout:    { fontSize: 16, fontWeight: '400' as const, letterSpacing: 0 },
  subhead:    { fontSize: 15, fontWeight: '400' as const, letterSpacing: 0 },
  footnote:   { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0 },
  caption1:   { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  caption2:   { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0 },
} as const;

// ── Legacy type scale — keep for backward compat ─────────────────────────────
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 44,
  '6xl': 54,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const LineHeight = {
  tight: 1.15,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const LetterSpacing = {
  tight: -1,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
  spaced: 8,
} as const;

export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
export type FontFamilyKey = keyof typeof FontFamily;
