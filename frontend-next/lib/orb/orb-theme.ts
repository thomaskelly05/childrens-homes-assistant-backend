/**
 * Canonical ORB Residential theme tokens — single source of truth for colours,
 * glass surfaces, typography, borders, radii, shadows, and layout spacing.
 * Route CSS (`app/orb/*.css`) should reference these values via CSS variables
 * applied on `.orb-residential-root` through `getOrbThemeCssVariables()`.
 */
import type { CSSProperties } from 'react'

import { ORB_DESIGN } from '@/lib/orb/design-tokens'

/** Royal blue brand accent used across residential ORB (`#168bff`). */
export const ORB_ROYAL_BLUE = '#168bff' as const

/** Deep blue for gradients and pressed states (`#0d5fcc`). */
export const ORB_DEEP_BLUE = ORB_DESIGN.primary.blueDeep

/** Soft blue for highlights and secondary accents (`#60a5fa`). */
export const ORB_SOFT_BLUE = ORB_DESIGN.primary.sky

export const ORB_THEME_COLORS = {
  royalBlue: ORB_ROYAL_BLUE,
  royalBlueDeep: ORB_DEEP_BLUE,
  deepBlue: ORB_DEEP_BLUE,
  softBlue: ORB_SOFT_BLUE,
  cyan: ORB_DESIGN.primary.cyan,
  sky: ORB_DESIGN.primary.sky,
  violet: ORB_DESIGN.primary.violet,
  pageBackground: ORB_DESIGN.background.dark[0],
  cardBackground: 'rgba(8, 17, 31, 0.92)',
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

export const ORB_THEME_BLUR = {
  header: '16px',
  glass: '20px',
  overlay: '12px',
  sidebar: '18px'
} as const

export const ORB_THEME_RADIUS = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  composer: '1.75rem',
  card: '1rem',
  pill: '9999px',
  orb: '50%'
} as const

export const ORB_THEME_SHADOWS = {
  glass: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 48px rgba(22, 139, 255, 0.06)',
  composer: '0 -8px 32px rgba(0, 0, 0, 0.35)',
  header: '0 1px 0 rgba(255, 255, 255, 0.06)',
  sidebar: '20px 0 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(22, 139, 255, 0.04)'
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
  headerMaxHeight: '3.75rem',
  composerMinHeight: '4rem',
  composerPaddingX: '0.75rem',
  threadPaddingX: '0.75rem',
  spacingInline: ORB_THEME_SPACING.md,
  spacingBlock: ORB_THEME_SPACING.sm
} as const

/** Mobile workspace panel surfaces — shared across ORB tool screens on `/orb`. */
export const ORB_THEME_MOBILE_WORKSPACE = {
  dark: {
    panel: '#070b14',
    card: 'rgba(8, 17, 31, 0.92)',
    cardBorder: 'rgba(66, 215, 255, 0.14)',
    text: '#f7faff',
    muted: '#a7aebd',
    input: 'rgba(255, 255, 255, 0.06)',
    footer: 'rgba(7, 11, 20, 0.98)'
  },
  light: {
    panel: '#f7fbff',
    card: '#ffffff',
    cardBorder: 'rgba(37, 99, 235, 0.14)',
    text: '#0f172a',
    muted: '#52657a',
    input: '#ffffff',
    footer: 'rgba(255, 255, 255, 0.98)'
  }
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
  contextPanelWidth: '22rem',
  composerMinHeight: '3.375rem',
  composerMinHeightCompact: '3.25rem',
  headerMinHeight: '3.5rem',
  headerMaxHeight: '3.75rem',
  spacingInline: ORB_THEME_SPACING.lg,
  spacingBlock: ORB_THEME_SPACING.md
} as const

export type OrbThemeMode = 'dark' | 'light'

/** Default resolved theme for ORB Residential when no user preference is stored. */
export const ORB_RESIDENTIAL_DEFAULT_THEME: OrbThemeMode = 'light'

/** Semantic ORB Residential tokens — consumed by route CSS and components. */
export const ORB_RES_CSS_VARS = {
  bg: '--orb-res-bg',
  surface: '--orb-res-surface',
  surfaceStrong: '--orb-res-surface-strong',
  card: '--orb-res-card',
  cardHover: '--orb-res-card-hover',
  border: '--orb-res-border',
  borderStrong: '--orb-res-border-strong',
  text: '--orb-res-text',
  textMuted: '--orb-res-text-muted',
  textSoft: '--orb-res-text-soft',
  primary: '--orb-res-primary',
  primaryStrong: '--orb-res-primary-strong',
  primarySoft: '--orb-res-primary-soft',
  glow: '--orb-res-glow',
  shadow: '--orb-res-shadow',
  inputBg: '--orb-res-input-bg',
  inputText: '--orb-res-input-text',
  inputPlaceholder: '--orb-res-input-placeholder',
  infoBg: '--orb-res-info-bg',
  infoBorder: '--orb-res-info-border',
  infoText: '--orb-res-info-text',
  warningBg: '--orb-res-warning-bg',
  warningBorder: '--orb-res-warning-border',
  warningText: '--orb-res-warning-text',
  statusPillBg: '--orb-res-status-pill-bg',
  statusPillText: '--orb-res-status-pill-text'
} as const

/** Readable info / warning surfaces for ORB Residential modals and banners. */
export const ORB_RESIDENTIAL_SEMANTIC_SURFACES = {
  light: {
    infoBg: '#eff6ff',
    infoBorder: '#bfdbfe',
    infoText: '#1e3a8a',
    warningBg: '#fffbeb',
    warningBorder: '#fbbf24',
    warningText: '#92400e',
    statusPillBg: 'rgba(22, 119, 255, 0.1)',
    statusPillText: '#1e3a8a'
  },
  dark: {
    infoBg: 'rgba(22, 119, 255, 0.12)',
    infoBorder: 'rgba(66, 215, 255, 0.28)',
    infoText: '#bfdbfe',
    warningBg: 'rgba(251, 191, 36, 0.12)',
    warningBorder: 'rgba(251, 191, 36, 0.35)',
    warningText: '#fde68a',
    statusPillBg: 'rgba(22, 139, 255, 0.14)',
    statusPillText: '#bfdbfe'
  }
} as const

const ORB_THEME_SHADOWS_LIGHT = {
  glass: '0 4px 24px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(22, 119, 255, 0.06)',
  composer: '0 -4px 24px rgba(15, 23, 42, 0.06)',
  header: '0 1px 0 rgba(37, 99, 235, 0.08)',
  sidebar: '12px 0 40px rgba(15, 23, 42, 0.06), 0 0 24px rgba(22, 119, 255, 0.05)'
} as const

/** CSS custom property names consumed by ORB route stylesheets. */
export const ORB_THEME_CSS_VARS = {
  foreground: '--orb-foreground',
  muted: '--orb-muted',
  line: '--orb-line',
  surface: '--orb-surface',
  surfaceElevated: '--orb-surface-elevated',
  surfaceHover: '--orb-surface-hover',
  bg: '--orb-bg',
  bgDeep: '--orb-bg-deep',
  pageBg: '--orb-page-bg',
  cardBg: '--orb-card-bg',
  accent: '--orb-accent',
  royalBlue: '--orb-royal-blue',
  deepBlue: '--orb-deep-blue',
  softBlue: '--orb-soft-blue',
  brandBlue: '--orb-brand-blue',
  brandCyan: '--orb-brand-cyan',
  glow: '--orb-glow',
  glass: '--orb-glass',
  glassStrong: '--orb-glass-strong',
  glassHighlight: '--orb-glass-highlight',
  textPrimary: '--orb-text-primary',
  textSecondary: '--orb-text-secondary',
  textMuted: '--orb-text-muted',
  border: '--orb-border',
  borderGlow: '--orb-border-glow',
  shadowGlass: '--orb-shadow-glass',
  shadowComposer: '--orb-shadow-composer',
  blurHeader: '--orb-blur-header',
  blurGlass: '--orb-blur-glass',
  blurOverlay: '--orb-blur-overlay',
  radiusSm: '--orb-radius-sm',
  radiusMd: '--orb-radius-md',
  radiusLg: '--orb-radius-lg',
  radiusComposer: '--orb-radius-composer',
  sidebarWidth: '--orb-sidebar-width',
  sidebarWidthCollapsed: '--orb-sidebar-width-collapsed',
  sidebarWidthMobile: '--orb-sidebar-width-mobile',
  chatColumnMax: '--orb-chat-column-max',
  composerMax: '--orb-composer-max',
  contextPanelWidth: '--orb-context-panel-width',
  composerHeight: '--orb-composer-height',
  headerHeightMin: '--orb-header-height-min',
  headerHeightMax: '--orb-header-height-max',
  spacingMobileInline: '--orb-spacing-mobile-inline',
  spacingMobileBlock: '--orb-spacing-mobile-block',
  spacingDesktopInline: '--orb-spacing-desktop-inline',
  spacingDesktopBlock: '--orb-spacing-desktop-block',
  overlay: '--orb-overlay',
  mobileWsPanel: '--orb-mobile-ws-panel',
  mobileWsCard: '--orb-mobile-ws-card',
  mobileWsCardBorder: '--orb-mobile-ws-card-border',
  mobileWsText: '--orb-mobile-ws-text',
  mobileWsMuted: '--orb-mobile-ws-muted',
  mobileWsInput: '--orb-mobile-ws-input',
  mobileWsFooter: '--orb-mobile-ws-footer'
} as const

const ORB_THEME_LIGHT_COLORS = {
  pageBackground: '#f7fbff',
  backgroundMid: '#ffffff',
  backgroundSoft: '#eef6ff',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#52657a',
  cardBackground: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceHover: '#e8f2ff',
  border: 'rgba(22, 119, 255, 0.18)',
  borderGlow: 'rgba(22, 119, 255, 0.28)',
  glass: 'rgba(255, 255, 255, 0.98)',
  glassStrong: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.22)',
  royalBlue: '#1677ff',
  deepBlue: '#0d5fcc',
  softBlue: '#3b82f6'
} as const


function residentialSemanticTokens(mode: OrbThemeMode) {
  if (mode === 'light') {
    return {
      [ORB_RES_CSS_VARS.bg]: '#f7fbff',
      [ORB_RES_CSS_VARS.surface]: 'rgba(255, 255, 255, 0.98)',
      [ORB_RES_CSS_VARS.surfaceStrong]: '#ffffff',
      [ORB_RES_CSS_VARS.card]: '#ffffff',
      [ORB_RES_CSS_VARS.cardHover]: '#edf6ff',
      [ORB_RES_CSS_VARS.border]: 'rgba(37, 99, 235, 0.14)',
      [ORB_RES_CSS_VARS.borderStrong]: 'rgba(22, 119, 255, 0.22)',
      [ORB_RES_CSS_VARS.text]: '#0f172a',
      [ORB_RES_CSS_VARS.textMuted]: '#52657a',
      [ORB_RES_CSS_VARS.textSoft]: '#64748b',
      [ORB_RES_CSS_VARS.primary]: '#1677ff',
      [ORB_RES_CSS_VARS.primaryStrong]: '#0d5fcc',
      [ORB_RES_CSS_VARS.primarySoft]: 'rgba(22, 119, 255, 0.1)',
      [ORB_RES_CSS_VARS.glow]: 'rgba(22, 119, 255, 0.18)',
      [ORB_RES_CSS_VARS.shadow]: ORB_THEME_SHADOWS_LIGHT.glass,
      [ORB_RES_CSS_VARS.inputBg]: '#ffffff',
      [ORB_RES_CSS_VARS.inputText]: '#0f172a',
      [ORB_RES_CSS_VARS.inputPlaceholder]: '#64748b',
      [ORB_RES_CSS_VARS.infoBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.infoBg,
      [ORB_RES_CSS_VARS.infoBorder]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.infoBorder,
      [ORB_RES_CSS_VARS.infoText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.infoText,
      [ORB_RES_CSS_VARS.warningBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.warningBg,
      [ORB_RES_CSS_VARS.warningBorder]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.warningBorder,
      [ORB_RES_CSS_VARS.warningText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.warningText,
      [ORB_RES_CSS_VARS.statusPillBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.statusPillBg,
      [ORB_RES_CSS_VARS.statusPillText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.light.statusPillText
    }
  }

  return {
    [ORB_RES_CSS_VARS.bg]: ORB_THEME_COLORS.pageBackground,
    [ORB_RES_CSS_VARS.surface]: 'rgba(8, 17, 31, 0.92)',
    [ORB_RES_CSS_VARS.surfaceStrong]: 'rgba(7, 11, 20, 0.96)',
    [ORB_RES_CSS_VARS.card]: 'rgba(8, 17, 31, 0.92)',
    [ORB_RES_CSS_VARS.cardHover]: 'rgba(255, 255, 255, 0.06)',
    [ORB_RES_CSS_VARS.border]: 'rgba(255, 255, 255, 0.1)',
    [ORB_RES_CSS_VARS.borderStrong]: 'rgba(66, 215, 255, 0.22)',
    [ORB_RES_CSS_VARS.text]: ORB_THEME_COLORS.textPrimary,
    [ORB_RES_CSS_VARS.textMuted]: ORB_THEME_COLORS.textSecondary,
    [ORB_RES_CSS_VARS.textSoft]: ORB_THEME_COLORS.textMuted,
    [ORB_RES_CSS_VARS.primary]: ORB_ROYAL_BLUE,
    [ORB_RES_CSS_VARS.primaryStrong]: ORB_DEEP_BLUE,
    [ORB_RES_CSS_VARS.primarySoft]: 'rgba(22, 139, 255, 0.14)',
    [ORB_RES_CSS_VARS.glow]: ORB_THEME_COLORS.glowElectric,
    [ORB_RES_CSS_VARS.shadow]: ORB_THEME_SHADOWS.glass,
    [ORB_RES_CSS_VARS.inputBg]: 'rgba(255, 255, 255, 0.06)',
    [ORB_RES_CSS_VARS.inputText]: ORB_THEME_COLORS.textPrimary,
    [ORB_RES_CSS_VARS.inputPlaceholder]: '#6f7787',
    [ORB_RES_CSS_VARS.infoBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.infoBg,
    [ORB_RES_CSS_VARS.infoBorder]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.infoBorder,
    [ORB_RES_CSS_VARS.infoText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.infoText,
    [ORB_RES_CSS_VARS.warningBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.warningBg,
    [ORB_RES_CSS_VARS.warningBorder]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.warningBorder,
    [ORB_RES_CSS_VARS.warningText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.warningText,
    [ORB_RES_CSS_VARS.statusPillBg]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.statusPillBg,
    [ORB_RES_CSS_VARS.statusPillText]: ORB_RESIDENTIAL_SEMANTIC_SURFACES.dark.statusPillText
  }
}

function residentialPalette(mode: OrbThemeMode) {
  if (mode === 'light') {
    return {
      colors: {
        ...ORB_THEME_COLORS,
        royalBlue: ORB_THEME_LIGHT_COLORS.royalBlue,
        deepBlue: ORB_THEME_LIGHT_COLORS.deepBlue,
        softBlue: ORB_THEME_LIGHT_COLORS.softBlue,
        pageBackground: ORB_THEME_LIGHT_COLORS.pageBackground,
        backgroundDeep: ORB_THEME_LIGHT_COLORS.pageBackground,
        backgroundMid: ORB_THEME_LIGHT_COLORS.backgroundMid,
        backgroundSoft: ORB_THEME_LIGHT_COLORS.backgroundSoft,
        textPrimary: ORB_THEME_LIGHT_COLORS.textPrimary,
        textSecondary: ORB_THEME_LIGHT_COLORS.textSecondary,
        textMuted: ORB_THEME_LIGHT_COLORS.textMuted,
        cardBackground: ORB_THEME_LIGHT_COLORS.cardBackground,
        glass: ORB_THEME_LIGHT_COLORS.glass,
        glassStrong: ORB_THEME_LIGHT_COLORS.glassStrong,
        border: ORB_THEME_LIGHT_COLORS.border,
        borderGlow: ORB_THEME_LIGHT_COLORS.borderGlow
      },
      surface: ORB_THEME_LIGHT_COLORS.surface,
      surfaceElevated: ORB_THEME_LIGHT_COLORS.surfaceElevated,
      surfaceHover: ORB_THEME_LIGHT_COLORS.surfaceHover,
      overlay: ORB_THEME_LIGHT_COLORS.overlay
    }
  }

  return {
    colors: ORB_THEME_COLORS,
    surface: ORB_THEME_COLORS.cardBackground,
    surfaceElevated: 'rgba(7, 11, 20, 0.96)',
    surfaceHover: 'rgba(255, 255, 255, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.72)'
  }
}

/**
 * Canonical CSS variable map for the `/orb` residential root.
 * Apply on `.orb-residential-root` in `OrbShell`.
 */
export function getOrbThemeCssVariables(mode: OrbThemeMode = ORB_RESIDENTIAL_DEFAULT_THEME): Record<string, string> {
  const palette = residentialPalette(mode)
  const { colors } = palette
  const mobileWorkspace = ORB_THEME_MOBILE_WORKSPACE[mode]
  const shadows = mode === 'light' ? ORB_THEME_SHADOWS_LIGHT : ORB_THEME_SHADOWS
  const semantic = residentialSemanticTokens(mode)

  return {
    ...semantic,
    [ORB_THEME_CSS_VARS.foreground]: colors.textPrimary,
    [ORB_THEME_CSS_VARS.muted]: colors.textSecondary,
    [ORB_THEME_CSS_VARS.line]: colors.border,
    [ORB_THEME_CSS_VARS.surface]: palette.surface,
    [ORB_THEME_CSS_VARS.surfaceElevated]: palette.surfaceElevated,
    [ORB_THEME_CSS_VARS.surfaceHover]: palette.surfaceHover,
    [ORB_THEME_CSS_VARS.bg]: colors.pageBackground,
    [ORB_THEME_CSS_VARS.bgDeep]: colors.backgroundDeep,
    [ORB_THEME_CSS_VARS.pageBg]: colors.pageBackground,
    [ORB_THEME_CSS_VARS.cardBg]: colors.cardBackground,
    [ORB_THEME_CSS_VARS.accent]: colors.royalBlue,
    [ORB_THEME_CSS_VARS.royalBlue]: colors.royalBlue,
    [ORB_THEME_CSS_VARS.deepBlue]: colors.deepBlue,
    [ORB_THEME_CSS_VARS.softBlue]: colors.softBlue,
    [ORB_THEME_CSS_VARS.brandBlue]: colors.royalBlue,
    [ORB_THEME_CSS_VARS.brandCyan]: colors.cyan,
    [ORB_THEME_CSS_VARS.glow]: colors.glowElectric,
    [ORB_THEME_CSS_VARS.glass]: colors.glass,
    [ORB_THEME_CSS_VARS.glassStrong]: colors.glassStrong,
    [ORB_THEME_CSS_VARS.glassHighlight]: 'rgba(255, 255, 255, 0.55)',
    [ORB_THEME_CSS_VARS.textPrimary]: colors.textPrimary,
    [ORB_THEME_CSS_VARS.textSecondary]: colors.textSecondary,
    [ORB_THEME_CSS_VARS.textMuted]: colors.textMuted,
    [ORB_THEME_CSS_VARS.border]: colors.border,
    [ORB_THEME_CSS_VARS.borderGlow]: colors.borderGlow,
    [ORB_THEME_CSS_VARS.shadowGlass]: shadows.glass,
    [ORB_THEME_CSS_VARS.shadowComposer]: shadows.composer,
    [ORB_THEME_CSS_VARS.blurHeader]: ORB_THEME_BLUR.header,
    [ORB_THEME_CSS_VARS.blurGlass]: ORB_THEME_BLUR.glass,
    [ORB_THEME_CSS_VARS.blurOverlay]: ORB_THEME_BLUR.overlay,
    [ORB_THEME_CSS_VARS.radiusSm]: ORB_THEME_RADIUS.sm,
    [ORB_THEME_CSS_VARS.radiusMd]: ORB_THEME_RADIUS.md,
    [ORB_THEME_CSS_VARS.radiusLg]: ORB_THEME_RADIUS.lg,
    [ORB_THEME_CSS_VARS.radiusComposer]: ORB_THEME_RADIUS.composer,
    [ORB_THEME_CSS_VARS.sidebarWidth]: ORB_THEME_LAYOUT_DESKTOP.sidebarWidth,
    [ORB_THEME_CSS_VARS.sidebarWidthCollapsed]: ORB_THEME_LAYOUT_DESKTOP.sidebarWidthCollapsed,
    [ORB_THEME_CSS_VARS.sidebarWidthMobile]: ORB_THEME_LAYOUT_MOBILE.sidebarWidth,
    [ORB_THEME_CSS_VARS.chatColumnMax]: ORB_THEME_LAYOUT_DESKTOP.chatColumnMaxResidentialMd,
    [ORB_THEME_CSS_VARS.composerMax]: ORB_THEME_LAYOUT_DESKTOP.composerMax,
    [ORB_THEME_CSS_VARS.contextPanelWidth]: ORB_THEME_LAYOUT_DESKTOP.contextPanelWidth,
    [ORB_THEME_CSS_VARS.composerHeight]: ORB_THEME_LAYOUT_DESKTOP.composerMinHeight,
    [ORB_THEME_CSS_VARS.headerHeightMin]: ORB_THEME_LAYOUT_DESKTOP.headerMinHeight,
    [ORB_THEME_CSS_VARS.headerHeightMax]: ORB_THEME_LAYOUT_DESKTOP.headerMaxHeight,
    [ORB_THEME_CSS_VARS.spacingMobileInline]: ORB_THEME_LAYOUT_MOBILE.spacingInline,
    [ORB_THEME_CSS_VARS.spacingMobileBlock]: ORB_THEME_LAYOUT_MOBILE.spacingBlock,
    [ORB_THEME_CSS_VARS.spacingDesktopInline]: ORB_THEME_LAYOUT_DESKTOP.spacingInline,
    [ORB_THEME_CSS_VARS.spacingDesktopBlock]: ORB_THEME_LAYOUT_DESKTOP.spacingBlock,
    [ORB_THEME_CSS_VARS.overlay]: palette.overlay,
    '--orb-premium-bg-deep': colors.backgroundDeep,
    '--orb-premium-bg-mid': colors.backgroundMid,
    '--orb-premium-bg-soft': colors.backgroundSoft,
    '--orb-premium-accent': colors.royalBlue,
    '--orb-premium-cyan': colors.cyan,
    '--orb-premium-violet': colors.violet,
    '--orb-premium-text': colors.textPrimary,
    '--orb-premium-text-secondary': colors.textSecondary,
    '--orb-premium-text-muted': colors.textMuted,
    '--orb-premium-border': colors.border,
    '--orb-premium-border-glow': colors.borderGlow,
    '--orb-premium-glass': colors.glass,
    '--orb-premium-glass-strong': colors.glassStrong,
    '--orb-premium-shadow': shadows.glass,
    '--orb-mobile-header-height': ORB_THEME_LAYOUT_MOBILE.headerMinHeight,
    '--orb-mobile-composer-height': ORB_THEME_LAYOUT_MOBILE.composerMinHeight,
    [ORB_THEME_CSS_VARS.mobileWsPanel]: mobileWorkspace.panel,
    [ORB_THEME_CSS_VARS.mobileWsCard]: mobileWorkspace.card,
    [ORB_THEME_CSS_VARS.mobileWsCardBorder]: mobileWorkspace.cardBorder,
    [ORB_THEME_CSS_VARS.mobileWsText]: mobileWorkspace.text,
    [ORB_THEME_CSS_VARS.mobileWsMuted]: mobileWorkspace.muted,
    [ORB_THEME_CSS_VARS.mobileWsInput]: mobileWorkspace.input,
    [ORB_THEME_CSS_VARS.mobileWsFooter]: mobileWorkspace.footer
  }
}

/** @deprecated Prefer `getOrbThemeCssVariables`. */
export function orbResidentialThemeCssVars(mode: OrbThemeMode = ORB_RESIDENTIAL_DEFAULT_THEME): Record<string, string> {
  return getOrbThemeCssVariables(mode)
}

/** Inline style object for the residential root wrapper in `OrbShell`. */
export function orbResidentialRootStyle(mode: OrbThemeMode = ORB_RESIDENTIAL_DEFAULT_THEME): CSSProperties {
  return getOrbThemeCssVariables(mode) as CSSProperties
}

/** Root class names for the canonical ORB residential shell. */
export const ORB_SHELL_ROOT_CLASS =
  'orb-residential-root min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[var(--orb-page-bg,var(--orb-bg,#f7fbff))] text-[var(--orb-text-primary,var(--orb-foreground,#0f172a))]'
