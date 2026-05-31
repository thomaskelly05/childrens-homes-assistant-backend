/** Premium ORB design tokens — ChatGPT + Apple calm institutional cognition. */
export const ORB_DESIGN = {
  primary: {
    cyan: '#42D7FF',
    sky: '#60A5FA',
    blue: '#168BFF',
    blueDeep: '#0D5FCC',
    violet: '#7C5CFF'
  },
  background: {
    light: ['#F8FAFC', '#F4F7FB', '#EEF4FF'] as const,
    dark: ['#05070D', '#070B14', '#08111F'] as const
  },
  text: {
    primary: '#F7FAFF',
    secondary: '#A7AEBD',
    muted: '#6F7787'
  },
  glass: {
    soft: 'rgba(255,255,255,0.045)',
    strong: 'rgba(255,255,255,0.07)'
  },
  border: {
    subtle: 'rgba(255,255,255,0.10)',
    glow: 'rgba(66,215,255,0.18)'
  },
  glow: {
    sky: 'rgba(96,165,250,0.16)',
    cyan: 'rgba(66,215,255,0.18)',
    electric: 'rgba(22,139,255,0.35)'
  }
} as const

export type OrbThemeMode = 'dark' | 'light'

export const ORB_THEME_STORAGE_KEY = 'orb-standalone-theme-v1'
