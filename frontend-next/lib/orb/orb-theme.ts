/**
 * Canonical ORB Residential theme tokens — single source of truth for colours,
 * glass surfaces, typography, borders, radii, shadows, and layout spacing.
 * Route CSS (`app/orb/*.css`) should reference these values via CSS variables
 * defined here and applied on the residential root.
 */
import type { CSSProperties } from 'react'

import { ORB_DESIGN } from '@/lib/orb/design-tokens'

/** Royal blue brand accent used across residential ORB (`#168bff`). */
export const ORB_ROYAL_BLUE = '#168bff' as const

export const ORB_THEME_COLORS = {
  royalBlue: ORB_ROYAL_BLUE,
  royalBlueDeep: ORB_DESIGN.primary.blueDeep,
  cyan: ORB_DESIGN.primary.cyan,
  sky: ORB_DESIGN.primary.sky,
  violet: ORB_DESIGN.primary.violet,
  backgroundDeep: ORB_DESIGN.background.dark[0],
  backgroundMid: ORB_DESIGN.background.dark[1],
  backgroundSoft: ORB_DESIGN.background.dark[2],
  textPrimary: ORB_DESIGN.text.primary,
  textSecondary: ORB_DESIGN.text.secondary,
  textMuted: ORB_DESIGN.text.muted,
  glass: ORB_DESIGN.glass.soft,
  glassStrong: ORB_DESIGN.glass.strong,
  border: ORB_DESIGN.border.subtle,
  borderGlow: ORB_DESIGN.border.glow,
  glowElectric: ORB_DESIGN.glow.electric
} as const

export const ORB_THEME_RADIUS = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  pill: '9999px',
  orb: '50%'
} as const

export const ORB_THEME_SHADOWS = {
  glass: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 48px rgba(22, 139, 255, 0.06)',
  composer: '0 -8px 32px rgba(0, 0, 0, 0.35)',
  header: '0 1px 0 rgba(255, 255, 255, 0.06)'
} as const

/** Shared spacing scale (rem). */
export const ORB_THEME_SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem'
} as const

/** Mobile-first layout tokens (matches `app/orb/orb-mobile.css`). */
export const ORB_THEME_LAYOUT_MOBILE = {
  sidebarWidth: 'min(86vw, 22.5rem)',
  chatColumnMax: '100%',
  headerMinHeight: '3.25rem',
  composerPaddingX: '0.75rem',
  threadPaddingX: '0.75rem'
} as const

/** Desktop layout tokens (matches `app/orb/orb-desktop.css` + premium tokens). */
export const ORB_THEME_LAYOUT_DESKTOP = {
  sidebarWidth: '18.125rem',
  sidebarWidthCollapsed: '4.25rem',
  sidebarWidthLegacy: '18.5rem',
  chatColumnMax: '52.5rem',
  chatColumnMaxResidentialMd: '50rem',
  chatColumnMaxResidentialLg: '53.75rem',
  composerMax: '50rem',
  headerMinHeight: '3.5rem',
  headerMaxHeight: '3.75rem'
} as const

export type OrbThemeMode = 'dark' | 'light'

/** CSS custom property names consumed by ORB route stylesheets. */
export const ORB_THEME_CSS_VARS = {
  foreground: '--orb-foreground',
  muted: '--orb-muted',
  line: '--orb-line',
  surface: '--orb-surface',
  surfaceElevated: '--orb-surface-elevated',
  surfaceHover: '--orb-surface-hover',
  bgDeep: '--orb-bg-deep',
  accent: '--orb-accent',
  brandBlue: '--orb-brand-blue',
  brandCyan: '--orb-brand-cyan',
  glow: '--orb-glow',
  glassHighlight: '--orb-glass-highlight',
  sidebarWidth: '--orb-sidebar-width',
  sidebarWidthCollapsed: '--orb-sidebar-width-collapsed',
  chatColumnMax: '--orb-chat-column-max',
  composerMax: '--orb-composer-max',
  overlay: '--orb-overlay'
} as const

/** Dark residential palette as CSS variables for inline root styling. */
export function orbResidentialThemeCssVars(mode: OrbThemeMode = 'dark'): Record<string, string> {
  const dark = mode === 'dark'
  return {
    [ORB_THEME_CSS_VARS.foreground]: ORB_THEME_COLORS.textPrimary,
    [ORB_THEME_CSS_VARS.muted]: ORB_THEME_COLORS.textSecondary,
    [ORB_THEME_CSS_VARS.line]: ORB_THEME_COLORS.border,
    [ORB_THEME_CSS_VARS.surface]: 'rgba(8, 17, 31, 0.92)',
    [ORB_THEME_CSS_VARS.surfaceElevated]: 'rgba(7, 11, 20, 0.96)',
    [ORB_THEME_CSS_VARS.surfaceHover]: 'rgba(255, 255, 255, 0.06)',
    [ORB_THEME_CSS_VARS.bgDeep]: ORB_THEME_COLORS.backgroundDeep,
    [ORB_THEME_CSS_VARS.accent]: ORB_THEME_COLORS.royalBlue,
    [ORB_THEME_CSS_VARS.brandBlue]: ORB_THEME_COLORS.royalBlue,
    [ORB_THEME_CSS_VARS.brandCyan]: ORB_THEME_COLORS.cyan,
    [ORB_THEME_CSS_VARS.glow]: ORB_THEME_COLORS.glowElectric,
    [ORB_THEME_CSS_VARS.glassHighlight]: 'rgba(255, 255, 255, 0.55)',
    [ORB_THEME_CSS_VARS.sidebarWidth]: ORB_THEME_LAYOUT_DESKTOP.sidebarWidth,
    [ORB_THEME_CSS_VARS.sidebarWidthCollapsed]: ORB_THEME_LAYOUT_DESKTOP.sidebarWidthCollapsed,
    [ORB_THEME_CSS_VARS.chatColumnMax]: ORB_THEME_LAYOUT_DESKTOP.chatColumnMaxResidentialMd,
    [ORB_THEME_CSS_VARS.composerMax]: ORB_THEME_LAYOUT_DESKTOP.composerMax,
    [ORB_THEME_CSS_VARS.overlay]: dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 42, 0.45)',
    '--orb-premium-bg-deep': ORB_THEME_COLORS.backgroundDeep,
    '--orb-premium-bg-mid': ORB_THEME_COLORS.backgroundMid,
    '--orb-premium-bg-soft': ORB_THEME_COLORS.backgroundSoft,
    '--orb-premium-accent': ORB_THEME_COLORS.royalBlue,
    '--orb-premium-cyan': ORB_THEME_COLORS.cyan,
    '--orb-premium-violet': ORB_THEME_COLORS.violet,
    '--orb-premium-text': ORB_THEME_COLORS.textPrimary,
    '--orb-premium-text-secondary': ORB_THEME_COLORS.textSecondary,
    '--orb-premium-text-muted': ORB_THEME_COLORS.textMuted,
    '--orb-premium-border': ORB_THEME_COLORS.border,
    '--orb-premium-border-glow': ORB_THEME_COLORS.borderGlow,
    '--orb-premium-glass': ORB_THEME_COLORS.glass,
    '--orb-premium-glass-strong': ORB_THEME_COLORS.glassStrong,
    '--orb-premium-shadow': ORB_THEME_SHADOWS.glass,
    '--orb-bg': ORB_THEME_COLORS.backgroundDeep
  }
}

/** Inline style object for the residential root wrapper in `OrbShell`. */
export function orbResidentialRootStyle(mode: OrbThemeMode = 'dark'): CSSProperties {
  return orbResidentialThemeCssVars(mode) as CSSProperties
}

/** Root class names for the canonical ORB residential shell. */
export const ORB_SHELL_ROOT_CLASS =
  'orb-residential-root min-h-[100dvh] bg-[var(--orb-bg,#05070d)] text-[var(--orb-foreground,#f7faff)]'
