import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'
import {
  ORB_RESIDENTIAL_LOCKED_THEME,
  resolveOrbResidentialTheme
} from '@/lib/orb/orb-appearance'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'
import { ORB_BUILD_VISUAL_VERSION, ORB_CSS_CONTRACT, ORB_STYLE_VERSION } from '@/lib/orb/orb-visual-build'

export type ApplyOrbResidentialThemeInput = {
  selectedAppearance: OrbAppearanceMode
  resolvedTheme: 'light' | 'dark'
}

const RESIDENTIAL_ROOT_SELECTORS = [
  '[data-orb-shell="true"]',
  '[data-orb-companion-root="true"]',
  '.orb-chat-layout--residential',
  '.orb-residential-root[data-orb-residential="true"]',
  '[data-orb-login-page]'
] as const

function applyCssVariables(target: HTMLElement, vars: Record<string, string | number | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value == null) continue
    target.style.setProperty(key, String(value))
  }
}

function toggleThemeClasses(el: HTMLElement, resolvedTheme: 'light' | 'dark'): void {
  const add = resolvedTheme === 'light' ? 'orb-theme-light' : 'orb-theme-dark'
  const remove = resolvedTheme === 'light' ? 'orb-theme-dark' : 'orb-theme-light'
  el.classList.remove(remove)
  el.classList.add(add)
}

/**
 * Single runtime authority for ORB Residential theme — updates html, body, shell, layout,
 * login roots, theme classes, and CSS variables whenever appearance or resolved theme changes.
 */
export function applyOrbResidentialTheme({
  selectedAppearance,
  resolvedTheme: _resolvedTheme
}: ApplyOrbResidentialThemeInput): void {
  if (typeof document === 'undefined') return

  const resolvedTheme = resolveOrbResidentialTheme(selectedAppearance)
  const selectedMode = ORB_RESIDENTIAL_LOCKED_THEME

  const html = document.documentElement
  const body = document.body
  const cssVars = getOrbThemeCssVariables(resolvedTheme)

  html.dataset.orbThemeLocked = resolvedTheme
  html.dataset.orbResidential = '1'
  html.dataset.orbTheme = resolvedTheme
  html.dataset.orbAppearance = selectedMode
  html.dataset.orbAppearanceMode = selectedMode
  html.dataset.orbSystemTheme = resolvedTheme
  html.dataset.orbStyleVersion = ORB_STYLE_VERSION
  html.dataset.orbBuildVisualVersion = ORB_BUILD_VISUAL_VERSION
  html.dataset.orbCssContract = ORB_CSS_CONTRACT
  html.style.colorScheme = resolvedTheme

  if (body) {
    body.dataset.orbTheme = resolvedTheme
    body.dataset.orbAppearance = selectedMode
    body.dataset.orbAppearanceMode = selectedMode
    body.dataset.orbThemeLocked = resolvedTheme
  }

  toggleThemeClasses(html, resolvedTheme)
  if (body) toggleThemeClasses(body, resolvedTheme)
  applyCssVariables(html, cssVars)

  for (const selector of RESIDENTIAL_ROOT_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
      root.dataset.orbTheme = resolvedTheme
      root.dataset.orbAppearance = selectedMode
      root.dataset.orbAppearanceMode = selectedMode
      root.dataset.orbSystemTheme = resolvedTheme
      root.dataset.orbThemeLocked = resolvedTheme
      if (root.hasAttribute('data-orb-residential') || selector.includes('orb-residential')) {
        root.dataset.orbResidential = 'true'
      }
      toggleThemeClasses(root, resolvedTheme)
      applyCssVariables(root, cssVars)
    })
  }
}

export function readOrbResidentialThemeMarkers(): {
  selectedAppearance: string | null
  resolvedTheme: string | null
  htmlTheme: string | null
  bodyTheme: string | null
  shellTheme: string | null
  layoutTheme: string | null
  htmlClasses: string
  bodyClasses: string
  shellClasses: string
  cssColorScheme: string
} {
  if (typeof document === 'undefined') {
    return {
      selectedAppearance: null,
      resolvedTheme: null,
      htmlTheme: null,
      bodyTheme: null,
      shellTheme: null,
      layoutTheme: null,
      htmlClasses: '',
      bodyClasses: '',
      shellClasses: '',
      cssColorScheme: ''
    }
  }

  const shell = document.querySelector('[data-orb-shell="true"]')
  const layout = document.querySelector('.orb-chat-layout--residential')

  return {
    selectedAppearance: document.documentElement.dataset.orbAppearanceMode ?? null,
    resolvedTheme:
      document.documentElement.dataset.orbSystemTheme ??
      document.documentElement.dataset.orbTheme ??
      null,
    htmlTheme: document.documentElement.dataset.orbTheme ?? null,
    bodyTheme: document.body?.dataset.orbTheme ?? null,
    shellTheme: shell?.getAttribute('data-orb-theme') ?? null,
    layoutTheme: layout?.getAttribute('data-orb-theme') ?? null,
    htmlClasses: document.documentElement.className,
    bodyClasses: document.body?.className ?? '',
    shellClasses: shell?.className ?? '',
    cssColorScheme: document.documentElement.style.colorScheme || ''
  }
}

export function collectOrbResidentialThemeMismatches(
  expectedResolved: 'light' | 'dark',
  expectedAppearance?: OrbAppearanceMode
): string[] {
  const markers = readOrbResidentialThemeMarkers()
  const mismatches: string[] = []

  if (markers.htmlTheme !== expectedResolved) {
    mismatches.push(`html data-orb-theme=${markers.htmlTheme ?? 'null'} expected ${expectedResolved}`)
  }
  if (markers.bodyTheme !== expectedResolved) {
    mismatches.push(`body data-orb-theme=${markers.bodyTheme ?? 'null'} expected ${expectedResolved}`)
  }
  if (markers.shellTheme && markers.shellTheme !== expectedResolved) {
    mismatches.push(`shell data-orb-theme=${markers.shellTheme} expected ${expectedResolved}`)
  }
  if (markers.layoutTheme && markers.layoutTheme !== expectedResolved) {
    mismatches.push(`layout data-orb-theme=${markers.layoutTheme} expected ${expectedResolved}`)
  }
  if (expectedAppearance && markers.selectedAppearance !== expectedAppearance) {
    mismatches.push(
      `appearance-mode=${markers.selectedAppearance ?? 'null'} expected ${expectedAppearance}`
    )
  }
  if (!document.documentElement.classList.contains(`orb-theme-${expectedResolved}`)) {
    mismatches.push(`html missing orb-theme-${expectedResolved}`)
  }

  return mismatches
}
