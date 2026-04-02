export const Colors = {
  // Backgrounds
  background: '#03060F',
  surface: '#0D1117',
  surfaceElevated: '#161B22',

  // Borders
  border: '#21262D',
  borderActive: '#388BFD',

  // Brand
  primary: '#388BFD',
  primaryGlow: '#1F6FEB',
  accent: '#3FB950',
  warning: '#D29922',
  critical: '#F85149',
  purple: '#BC8CFF',

  // Text
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',

  // Gradients
  gradientBlue: ['#388BFD', '#1F6FEB'] as [string, string],
  gradientGreen: ['#3FB950', '#2EA043'] as [string, string],
  gradientPurple: ['#BC8CFF', '#8957E5'] as [string, string],
  gradientCritical: ['#F85149', '#DA3633'] as [string, string],
} as const;

export type ColorKey = keyof typeof Colors;
