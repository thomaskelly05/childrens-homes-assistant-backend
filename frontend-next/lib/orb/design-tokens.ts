/** Premium ORB design tokens — ChatGPT + Apple calm institutional cognition. */
export const ORB_DESIGN = {
  primary: {
    cyan: '#4CC9F0',
    sky: '#60A5FA',
    blue: '#2563EB',
    blueDeep: '#1D4ED8'
  },
  background: {
    light: ['#F8FAFC', '#F4F7FB', '#EEF4FF'] as const,
    dark: ['#07111F', '#0B1728', '#0E2238'] as const
  },
  glow: {
    sky: 'rgba(96,165,250,0.16)',
    cyan: 'rgba(76,201,240,0.18)'
  }
} as const

export type OrbThemeMode = 'dark' | 'light'

export const ORB_THEME_STORAGE_KEY = 'orb-standalone-theme-v1'
