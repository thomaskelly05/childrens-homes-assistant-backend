/**
 * Browser-only ORB UI duplication audit helpers (debug / developer mode).
 */

export type OrbUiAuditResult = {
  shellCount: number
  activePanelCount: number
  appPanelCount: number
  panelNames: string[]
  backdropCount: number
  overlayCount: number
  composerCount: number
  composerAgentSelectorCount: number
  visibleComposerAgentSelectorCount: number
  footerCount: number
  visibleFooterCount: number
  footerText: string | null
  residentialRootCount: number
  mobileBranchCount: number
  desktopBranchCount: number
  voiceActionSurfaceCount: number
  dictateLayoutCount: number
  settingsPanelCount: number
  billingPanelCount: number
  accountPanelCount: number
  hiddenButPointerActiveElements: number
  duplicateButtonsByText: Record<string, number>
  topLayerElements: string[]
  voiceStartHitTest: OrbUiHitTestResult
  themeMarkers: {
    htmlOrbAppearance: string | null
    htmlOrbTheme: string | null
    shellTheme: string | null
    layoutTheme: string | null
    bodyClasses: string
    themeLightClasses: number
    themeDarkClasses: number
    duplicateThemeRoots: number
  }
}

export type OrbUiHitTestResult = {
  selector: string
  found: boolean
  isActuallyOnTop: boolean
  clickWouldHitTarget: boolean
  topElementTag: string | null
  topElementDescription: string | null
  rect: { x: number; y: number; width: number; height: number } | null
}

function describeElement(el: Element | null): string | null {
  if (!el) return null
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const panel = el.getAttribute('data-orb-app-panel-name')
  const testId = el.getAttribute('data-testid')
  const orb = el.getAttribute('data-orb-voice-primary-action')
  const text = (el.textContent || '').trim().slice(0, 40)
  return `${tag}${id}${panel ? `[panel=${panel}]` : ''}${testId ? `[testid=${testId}]` : ''}${orb ? `[action=${orb}]` : ''}${text ? ` "${text}"` : ''}`
}

function resolveTarget(selectorOrText: string): Element | null {
  if (typeof document === 'undefined') return null
  try {
    const bySelector = document.querySelector(selectorOrText)
    if (bySelector) return bySelector
  } catch {
    /* not a valid selector */
  }
  const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'))
  const needle = selectorOrText.trim().toLowerCase()
  return (
    buttons.find((el) => (el.textContent || '').trim().toLowerCase() === needle) ??
    buttons.find((el) => (el.textContent || '').trim().toLowerCase().includes(needle)) ??
    null
  )
}

function elementAtCenter(target: Element): Element | null {
  const rect = target.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return document.elementFromPoint(cx, cy)
}

function countByText(): Record<string, number> {
  const counts: Record<string, number> = {}
  const labels = [
    'Start voice',
    'Type instead',
    'Use Dictate',
    'Start recording',
    'Generate professional note',
    'Subscribe',
    'Send message'
  ]
  for (const label of labels) {
    const needle = label.toLowerCase()
    counts[label] =
      Array.from(document.querySelectorAll('button, [role="button"]')).filter((el) =>
        (el.textContent || '').trim().toLowerCase().includes(needle)
      ).length
  }
  return counts
}

function isVisibleElement(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  const style = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) !== 0 &&
    rect.width > 0 &&
    rect.height > 0
  )
}

function hiddenPointerActiveCount(): number {
  return Array.from(document.querySelectorAll('*')).filter((el) => {
    if (!(el instanceof HTMLElement)) return false
    const style = window.getComputedStyle(el)
    const hidden =
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity) === 0
    if (!hidden) return false
    const pe = style.pointerEvents
    return pe !== 'none' && el.querySelector('button, [role="button"], a, input, textarea, select')
  }).length
}

export function runOrbUiAudit(): OrbUiAuditResult {
  const doc = document.documentElement
  const activePanels = Array.from(document.querySelectorAll('[data-orb-app-panel-active="true"]'))
  const panelNames = activePanels
    .map((el) => el.getAttribute('data-orb-app-panel-name') || el.getAttribute('data-orb-panel-shell'))
    .filter((name): name is string => Boolean(name))

  const themeRoots = document.querySelectorAll(
    '[data-orb-theme]:not(html), [data-orb-appearance]:not(html), .orb-residential-root[data-orb-theme]'
  )

  const topCandidates = Array.from(
    document.querySelectorAll(
      '[data-orb-voice-primary-action="start"], [data-orb-composer-send], [data-orb-app-panel-backdrop]'
    )
  ).slice(0, 8)

  const agentSelectors = Array.from(document.querySelectorAll('[data-orb-composer-agent-selector]'))
  const footers = Array.from(document.querySelectorAll('[data-orb-footer="main"]'))
  const visibleFooters = footers.filter(isVisibleElement)
  const shell = document.querySelector('[data-orb-shell="true"]')
  const layout = document.querySelector('.orb-chat-layout--residential')

  return {
    shellCount: document.querySelectorAll('[data-orb-shell="true"]').length,
    activePanelCount: activePanels.length,
    appPanelCount: document.querySelectorAll('[data-orb-app-panel-root]').length,
    panelNames,
    backdropCount: document.querySelectorAll('[data-orb-app-panel-backdrop]').length,
    overlayCount: document.querySelectorAll('.orb-panel-overlay').length,
    composerCount: document.querySelectorAll('[data-orb-composer="main"]').length,
    composerAgentSelectorCount: agentSelectors.length,
    visibleComposerAgentSelectorCount: agentSelectors.filter(isVisibleElement).length,
    footerCount: footers.length,
    visibleFooterCount: visibleFooters.length,
    footerText: visibleFooters[0]?.textContent?.trim().replace(/\s+/g, ' ') ?? null,
    residentialRootCount: document.querySelectorAll('.orb-residential-root').length,
    mobileBranchCount: document.querySelectorAll('[data-orb-mobile-branch="active"]').length,
    desktopBranchCount: document.querySelectorAll('[data-orb-desktop-branch="active"]').length,
    voiceActionSurfaceCount: document.querySelectorAll('[data-orb-voice-action-surface="primary"]').length,
    dictateLayoutCount: document.querySelectorAll('[data-orb-dictate-station]').length,
    settingsPanelCount: document.querySelectorAll('[data-orb-panel-shell="settings"], [data-orb-app-panel-name="settings"]').length,
    billingPanelCount: document.querySelectorAll('[data-orb-panel-shell="billing"], [data-orb-app-panel-name="billing"]').length,
    accountPanelCount: document.querySelectorAll('[data-orb-panel-shell="account"], [data-orb-app-panel-name="account"]').length,
    hiddenButPointerActiveElements: hiddenPointerActiveCount(),
    duplicateButtonsByText: countByText(),
    topLayerElements: topCandidates.map((el) => describeElement(el)).filter((s): s is string => Boolean(s)),
    voiceStartHitTest: runOrbUiHitTest('[data-orb-voice-primary-action="start"]'),
    themeMarkers: {
      htmlOrbAppearance: doc.dataset.orbAppearance ?? null,
      htmlOrbTheme: doc.dataset.orbTheme ?? null,
      shellTheme: shell?.getAttribute('data-orb-theme') ?? null,
      layoutTheme: layout?.getAttribute('data-orb-theme') ?? null,
      bodyClasses: document.body.className,
      themeLightClasses: document.querySelectorAll('.orb-theme-light').length,
      themeDarkClasses: document.querySelectorAll('.orb-theme-dark').length,
      duplicateThemeRoots: themeRoots.length
    }
  }
}

export function runOrbUiHitTest(selectorOrText: string): OrbUiHitTestResult {
  const target = resolveTarget(selectorOrText)
  if (!target) {
    return {
      selector: selectorOrText,
      found: false,
      isActuallyOnTop: false,
      clickWouldHitTarget: false,
      topElementTag: null,
      topElementDescription: null,
      rect: null
    }
  }

  const rect = target.getBoundingClientRect()
  const top = elementAtCenter(target)
  const clickWouldHitTarget = Boolean(
    top && (top === target || target.contains(top) || top.contains(target))
  )

  return {
    selector: selectorOrText,
    found: true,
    isActuallyOnTop: clickWouldHitTarget,
    clickWouldHitTarget,
    topElementTag: top?.tagName.toLowerCase() ?? null,
    topElementDescription: describeElement(top),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }
}

export function runOrbUiDuplicates(): {
  duplicateButtonsByText: Record<string, number>
  voiceStartButtons: number
  voiceActionSurfaces: number
  activePanels: number
} {
  const audit = runOrbUiAudit()
  return {
    duplicateButtonsByText: audit.duplicateButtonsByText,
    voiceStartButtons: document.querySelectorAll('[data-orb-voice-primary-action="start"]').length,
    voiceActionSurfaces: audit.voiceActionSurfaceCount,
    activePanels: audit.activePanelCount
  }
}

export function registerOrbUiAuditGlobals(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & {
    ORB_UI_AUDIT?: () => OrbUiAuditResult
    ORB_UI_HIT_TEST?: (selectorOrText: string) => OrbUiHitTestResult
    ORB_UI_DUPLICATES?: () => ReturnType<typeof runOrbUiDuplicates>
  }
  w.ORB_UI_AUDIT = runOrbUiAudit
  w.ORB_UI_HIT_TEST = runOrbUiHitTest
  w.ORB_UI_DUPLICATES = runOrbUiDuplicates
}
