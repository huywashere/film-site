// Design tokens matching web's dark theme
// Colors from tailwind.config.js / globals.css

export const Colors = {
  // Backgrounds
  background: '#0a0a0a',
  backgroundSecondary: '#111113',
  backgroundCard: '#18181b',
  backgroundElevated: '#1c1c1f',

  // Accent / Brand
  accent: '#524cf8',
  accentHover: '#7c3aed',
  accentLight: 'rgba(82, 76, 248, 0.15)',

  // ArtPlayer blue accent
  playerBlue: '#23ade5',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b80',
  textDisabled: '#3a3a4a',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // Skeleton
  skeleton: '#1e1e24',
  skeletonHighlight: '#2a2a32',

  // Tab bar
  tabBarBackground: 'rgba(10, 10, 10, 0.95)',
  tabBarActive: '#524cf8',
  tabBarInactive: '#6b6b80',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
  hero: 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#524cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
