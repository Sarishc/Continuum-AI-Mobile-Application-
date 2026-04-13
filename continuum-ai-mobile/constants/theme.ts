import { Platform } from 'react-native';

// ─── Spacing (8pt grid) ───────────────────────────────────────────────────────
export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
const ios = (
  color: string,
  offset: { width: number; height: number },
  opacity: number,
  radius: number,
) => Platform.select({ ios: { shadowColor: color, shadowOffset: offset, shadowOpacity: opacity, shadowRadius: radius }, android: {}, default: {} });

export const Shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    android: { elevation: 3 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    android: { elevation: 6 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    android: { elevation: 10 },
    default: {},
  }),
  electric: Platform.select({
    ios: { shadowColor: '#4F7EFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
    android: { elevation: 10 },
    default: {},
  }),
  critical: Platform.select({
    ios: { shadowColor: '#FF4F6B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    android: { elevation: 8 },
    default: {},
  }),
  positive: Platform.select({
    ios: { shadowColor: '#00C896', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    android: { elevation: 8 },
    default: {},
  }),
  // Legacy aliases
  blue: Platform.select({
    ios: { shadowColor: '#4F7EFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

// ─── Web-safe shadow helpers ──────────────────────────────────────────────────
// Use these instead of raw shadow* props so web doesn't throw deprecation warnings.
export const shadows = {
  sm: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.30)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  }),
  md: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(0,0,0,0.40)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  }),
  electric: Platform.select({
    web: { boxShadow: '0 0 24px rgba(76,141,255,0.25)' } as any,
    default: { shadowColor: '#4C8DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
  }),
  glow: (color: string) => Platform.select({
    web: { boxShadow: `0 0 20px ${color}40` } as any,
    default: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
  }) ?? {},
} as const;

// ─── Hit slop helper (increases touch target without changing layout) ─────────
export const HitSlop = {
  sm: { top: 8, right: 8, bottom: 8, left: 8 },
  md: { top: 12, right: 12, bottom: 12, left: 12 },
  lg: { top: 16, right: 16, bottom: 16, left: 16 },
} as const;
