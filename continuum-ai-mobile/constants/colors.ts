// ─── Continuum AI — "Living Health OS" Color System ─────────────────────────
// Warm blacks (not cold blue-black), Apple semantic colors, glass surfaces.

// Base depth layers
export const Blacks = {
  obsidian: '#000000',   // true black — outer frame
  void: '#000000',       // true black
  abyss: '#080808',      // page background
  depth: '#0E0E0E',      // section backgrounds
  surface: '#161616',    // card backgrounds
  elevated: '#1E1E1E',   // elevated cards, overlays
  overlay: '#262626',    // modals, sheets
  rim: 'rgba(255,255,255,0.06)',     // subtle borders
  rimActive: 'rgba(255,255,255,0.15)', // active borders
} as const;

// Glass surfaces
export const Glass = {
  glass: 'rgba(255,255,255,0.05)',      // 5% white — subtle glass
  glassStrong: 'rgba(255,255,255,0.10)', // 10% white — stronger glass
  glassHighlight: 'rgba(255,255,255,0.15)', // top-edge highlights
  glassBorder: 'rgba(255,255,255,0.10)',   // glass card borders
} as const;

// Primary — warm electric blue (not cold)
export const Electric = {
  electric: '#4C8DFF',
  electricBright: '#6FA4FF',
  electricDeep: '#2563EB',
  electricGlow: 'rgba(76,141,255,0.20)',
  electricMist: 'rgba(76,141,255,0.10)',
} as const;

// Apple Health semantic colors — warm, human
export const Semantic = {
  // Vital / good (Apple green)
  vital: '#30D158',
  vitalGlow: 'rgba(48,209,88,0.18)',
  positive: '#30D158',
  positiveGlow: 'rgba(48,209,88,0.18)',

  // Alert / warning (Apple orange)
  alert: '#FF9F0A',
  alertGlow: 'rgba(255,159,10,0.18)',
  caution: '#FF9F0A',
  cautionGlow: 'rgba(255,159,10,0.18)',

  // Critical (Apple red)
  critical: '#FF453A',
  criticalGlow: 'rgba(255,69,58,0.18)',

  // Insight / AI / mindful (Apple purple)
  insight: '#BF5AF2',
  insightGlow: 'rgba(191,90,242,0.18)',
  mindful: '#BF5AF2',
  mindfulGlow: 'rgba(191,90,242,0.18)',

  // Energy / streak (warm orange)
  energy: '#FF6B00',
  energyGlow: 'rgba(255,107,0,0.18)',
} as const;

// Achievement
export const Achievement = {
  gold: '#FFD60A',
  goldGlow: 'rgba(255,214,10,0.20)',
} as const;

// Text hierarchy — warmer whites
export const TextColors = {
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.30)',
  textMuted: 'rgba(255,255,255,0.15)',
  textQuaternary: 'rgba(255,255,255,0.08)',
  textInverse: '#000000',
} as const;

// Gradient arrays
export const Gradients = {
  gradientElectric: ['#4C8DFF', '#2563EB'] as [string, string],
  gradientPositive: ['#30D158', '#25A244'] as [string, string],
  gradientCritical: ['#FF453A', '#D93025'] as [string, string],
  gradientCaution: ['#FF9F0A', '#CC7D00'] as [string, string],
  gradientInsight: ['#BF5AF2', '#9B30D6'] as [string, string],
  gradientGlass: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'] as [string, string],
  gradientDepth: ['#080808', '#000000'] as [string, string],
  gradientGold: ['#FFD60A', '#E6B800'] as [string, string],
} as const;

// ─── Flat Colors export — backward-compatible key names ──────────────────────
export const Colors = {
  // ── Base layers ──────────────────────────────────────────────────────────
  ...Blacks,
  background: Blacks.abyss,        // '#080808'
  base: Blacks.abyss,              // alias: base page bg
  surfaceElevated: Blacks.elevated,

  // ── Glass ─────────────────────────────────────────────────────────────────
  ...Glass,

  // ── Borders ───────────────────────────────────────────────────────────────
  border: Blacks.rim,
  borderActive: Blacks.rimActive,

  // ── Brand electric ────────────────────────────────────────────────────────
  ...Electric,
  primary: Electric.electric,
  primaryBright: Electric.electricBright,
  primaryDeep: Electric.electricDeep,
  primaryGlow: Electric.electricGlow,
  primaryMist: Electric.electricMist,

  // ── Semantic ──────────────────────────────────────────────────────────────
  ...Semantic,
  warning: Semantic.caution,
  accent: Semantic.vital,
  purple: Semantic.insight,

  // ── Achievement ───────────────────────────────────────────────────────────
  ...Achievement,

  // ── Text ──────────────────────────────────────────────────────────────────
  ...TextColors,

  // ── Gradients ─────────────────────────────────────────────────────────────
  ...Gradients,

  // Legacy gradient aliases (kept for backward compat)
  gradientBlue: Gradients.gradientElectric,
  gradientGreen: Gradients.gradientPositive,
  gradientPurple: ['#BF5AF2', '#9B30D6'] as [string, string],

  // ── Misc legacy ───────────────────────────────────────────────────────────
  obsidian: Blacks.obsidian,
} as const;

export type ColorKey = keyof typeof Colors;

// ─── Semantic glass surface — primary card material ───────────────────────────
// Use this StyleSheet spread for all glass cards: backgroundColor, borderWidth, borderColor
export const GLASS_1 = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 0.5 as const,
  borderColor: 'rgba(255,255,255,0.10)',
} as const;
