// ─── Continuum AI — Typography System ────────────────────────────────────────
// Display font : Syne  (geometric, distinctive, premium)
// Body font    : Inter (clarity at every size)

export const FontFamily = {
  // ── Syne (display, headers, numbers, UI labels) ───────────────────────────
  displayRegular: 'Syne_400Regular',
  displayMedium: 'Syne_500Medium',
  displaySemiBold: 'Syne_600SemiBold',
  displayBold: 'Syne_700Bold',
  displayExtraBold: 'Syne_800ExtraBold',

  // ── Inter (body, captions, descriptions) ─────────────────────────────────
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  // ── Convenience aliases (used by older screens) ───────────────────────────
  display: 'Syne_700Bold',          // was DMSerifDisplay
  bodySemiBoldLegacy: 'Inter_600SemiBold',
} as const;

// ── Type scale ────────────────────────────────────────────────────────────────
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

// ── Usage rules ───────────────────────────────────────────────────────────────
// HEADERS      → Syne_700Bold or Syne_800ExtraBold
// SUBHEADINGS  → Syne_600SemiBold
// UI LABELS    → Syne_500Medium
// BODY TEXT    → Inter_400Regular or Inter_500Medium
// DATA/NUMBERS → Syne_700Bold  (Syne numerals are exceptional)
// CAPTIONS     → Inter_400Regular

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

// ── Letter spacing presets (used for uppercase labels) ────────────────────────
export const LetterSpacing = {
  tight: -1,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
  spaced: 8,  // e.g. "CONTINUUM" wordmark
} as const;

export type FontSizeKey = keyof typeof FontSize;
export type FontWeightKey = keyof typeof FontWeight;
export type FontFamilyKey = keyof typeof FontFamily;
