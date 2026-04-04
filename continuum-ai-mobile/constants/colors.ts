// ─── Continuum AI — "Clinical Luxury" Color System ───────────────────────────

// Blacks: layered depth system
export const Blacks = {
  obsidian: '#000000',   // true black — screen edges, overlays
  void: '#050508',       // near-black — main background
  abyss: '#0A0B0F',     // page background
  depth: '#0F1117',     // section backgrounds
  surface: '#14161E',   // card backgrounds
  elevated: '#1A1D27',  // elevated cards
  overlay: '#1F2231',   // modals, sheets
  rim: '#252838',       // borders default
  rimActive: '#353852', // borders focused / active
} as const;

// Electric Blue: primary brand accent
export const Electric = {
  electric: '#4F7EFF',
  electricBright: '#6B95FF',
  electricDeep: '#3560E0',
  electricGlow: 'rgba(79,126,255,0.15)',
  electricMist: 'rgba(79,126,255,0.08)',
} as const;

// Semantic: data / status only
export const Semantic = {
  positive: '#00C896',
  positiveGlow: 'rgba(0,200,150,0.12)',
  caution: '#FFB547',
  cautionGlow: 'rgba(255,181,71,0.12)',
  critical: '#FF4F6B',
  criticalGlow: 'rgba(255,79,107,0.12)',
  insight: '#A78BFA',
  insightGlow: 'rgba(167,139,250,0.12)',
} as const;

// Text: 5-level hierarchy
export const Text = {
  textPrimary: '#F0F2FF',
  textSecondary: '#9BA3C4',
  textTertiary: '#5C6384',
  textMuted: '#3A3F5C',
  textInverse: '#000000',
} as const;

// Gradient arrays (use with expo-linear-gradient)
export const Gradients = {
  gradientElectric: ['#4F7EFF', '#3560E0'] as [string, string],
  gradientPositive: ['#00C896', '#00A87A'] as [string, string],
  gradientCritical: ['#FF4F6B', '#E03050'] as [string, string],
  gradientGlass: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string],
  gradientDepth: ['#0A0B0F', '#050508'] as [string, string],
  gradientCaution: ['#FFB547', '#E09A30'] as [string, string],
} as const;

// ─── Flat Colors export (backward-compat + convenience) ───────────────────────
export const Colors = {
  // Backgrounds
  background: Blacks.void,
  surface: Blacks.surface,
  surfaceElevated: Blacks.elevated,
  overlay: Blacks.overlay,

  // Blacks (direct access)
  ...Blacks,

  // Borders
  border: Blacks.rim,
  borderActive: Electric.electric,

  // Brand
  ...Electric,
  primary: Electric.electric,
  primaryBright: Electric.electricBright,
  primaryDeep: Electric.electricDeep,
  primaryGlow: Electric.electricGlow,
  primaryMist: Electric.electricMist,

  // Semantic
  positive: Semantic.positive,
  positiveGlow: Semantic.positiveGlow,
  caution: Semantic.caution,
  cautionGlow: Semantic.cautionGlow,
  critical: Semantic.critical,
  criticalGlow: Semantic.criticalGlow,
  insight: Semantic.insight,
  insightGlow: Semantic.insightGlow,

  // Legacy aliases (kept for backward compat)
  warning: Semantic.caution,
  accent: Semantic.positive,
  purple: Semantic.insight,

  // Text
  ...Text,

  // Gradients
  ...Gradients,

  // Legacy gradient aliases
  gradientBlue: Gradients.gradientElectric,
  gradientGreen: Gradients.gradientPositive,
  gradientPurple: ['#A78BFA', '#7C5FD4'] as [string, string],
  gradientCritical: Gradients.gradientCritical,
} as const;

export type ColorKey = keyof typeof Colors;
