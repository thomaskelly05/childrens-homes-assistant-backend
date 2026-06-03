/**
 * Browser-only ORB UI duplication audit helpers (debug / developer mode).
 */

export type OrbDesktopThemeAuditResult = {
  shellTheme: string | null
  layoutTheme: string | null
  htmlOrbTheme: string | null
  residentialFlag: boolean
  themeLightClassCount: number
  themeDarkClassCount: number
  residentialLightLayoutCount: number
  whiteCardCountInResidential: number
  visibleComposerCount: number
  residentialRootCount: number
  desktopOverflowWidth: number
  mobileOverflowWidth: number
  documentScrollWidth: number
  viewportWidth: number
  ok: boolean
}

export type OrbDesktopLayoutAuditResult = {
  viewportWidth: number
  viewportHeight: number
  sidebarWidth: number | null
  mainContentWidth: number | null
  activeRoute: string | null
  activeWorkspacePanel: string | null
  maxWidthContainers: Array<{ selector: string; maxWidth: string; width: number }>
  orbPresenceBoundingBox: { x: number; y: number; width: number; height: number } | null
  headingBoundingBox: { x: number; y: number; width: number; height: number } | null
  overlapWarnings: string[]
  elementsExceedingViewport: string[]
  mobileOnlyClassesActiveOnDesktop: string[]
  staticOrbImageCount: number
  visibleLivingSphereCount: number
  composerVisibleOnHomeChat: boolean
  sidebarScrollContainerExists: boolean
  accountFooterReachable: boolean
  horizontalOverflow: boolean
  activeContentFitsViewport: boolean
  themeMismatchCount: number
  ok: boolean
}

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

function countWhiteCardsInResidential(): number {
  const root =
    document.querySelector('[data-orb-shell="true"][data-orb-residential="true"]') ??
    document.querySelector('.orb-chat-layout--residential')
  if (!root) return 0

  const whiteSelectors = [
    '.bg-white',
    '.bg-slate-50',
    '.bg-slate-100',
    '.orb-billing-card',
    '.orb-mobile-workspace-card',
    '.orb-premium-settings-card',
    '.orb-doc-glass-card'
  ].join(',')

  return Array.from(root.querySelectorAll(whiteSelectors)).filter((el) => {
    if (!(el instanceof HTMLElement) || !isVisibleElement(el)) return false
    const bg = window.getComputedStyle(el).backgroundColor
    return (
      bg === 'rgb(255, 255, 255)' ||
      bg === 'rgba(255, 255, 255, 1)' ||
      bg === 'rgb(248, 250, 252)' ||
      bg === 'rgb(247, 251, 255)'
    )
  }).length
}

/** Debug helper — residential desktop/mobile theme authority and overflow. */
export function runOrbDesktopThemeAudit(): OrbDesktopThemeAuditResult {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      shellTheme: null,
      layoutTheme: null,
      htmlOrbTheme: null,
      residentialFlag: false,
      themeLightClassCount: 0,
      themeDarkClassCount: 0,
      residentialLightLayoutCount: 0,
      whiteCardCountInResidential: 0,
      visibleComposerCount: 0,
      residentialRootCount: 0,
      desktopOverflowWidth: 0,
      mobileOverflowWidth: 0,
      documentScrollWidth: 0,
      viewportWidth: 0,
      ok: true
    }
  }

  const viewportWidth = window.innerWidth
  const documentScrollWidth = document.documentElement.scrollWidth
  const shell = document.querySelector('[data-orb-shell="true"]')
  const layout = document.querySelector('.orb-chat-layout--residential')
  const composers = Array.from(document.querySelectorAll('[data-orb-composer="main"]')).filter(
    isVisibleElement
  )
  const residentialLightLayouts = document.querySelectorAll(
    '.orb-chat-layout--residential.orb-theme-light'
  ).length
  const themeLightClassCount = document.querySelectorAll('.orb-theme-light').length
  const themeDarkClassCount = document.querySelectorAll('.orb-theme-dark').length
  const whiteCardCountInResidential = countWhiteCardsInResidential()
  const overflow = auditOrbMobileViewportOverflow(viewportWidth)

  const shellTheme = shell?.getAttribute('data-orb-theme') ?? null
  const layoutTheme = layout?.getAttribute('data-orb-theme') ?? null
  const htmlOrbTheme = document.documentElement.dataset.orbTheme ?? null
  const residentialFlag = document.documentElement.dataset.orbResidential === '1'

  const resolvedTheme = shellTheme ?? layoutTheme ?? htmlOrbTheme

  const ok =
    residentialFlag &&
    Boolean(resolvedTheme) &&
    (resolvedTheme === 'light' || resolvedTheme === 'dark') &&
    shellTheme === resolvedTheme &&
    (layoutTheme === null || layoutTheme === resolvedTheme) &&
    (htmlOrbTheme === null || htmlOrbTheme === resolvedTheme) &&
    composers.length <= 1 &&
    overflow.ok

  return {
    shellTheme,
    layoutTheme,
    htmlOrbTheme,
    residentialFlag,
    themeLightClassCount,
    themeDarkClassCount,
    residentialLightLayoutCount: residentialLightLayouts,
    whiteCardCountInResidential,
    visibleComposerCount: composers.length,
    residentialRootCount: document.querySelectorAll('.orb-residential-root').length,
    desktopOverflowWidth: documentScrollWidth,
    mobileOverflowWidth: overflow.documentScrollWidth,
    documentScrollWidth,
    viewportWidth,
    ok
  }
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

export type OrbMobileViewportOverflowOffender = {
  selector: string
  tag: string
  right: number
  width: number
}

export type OrbMobileViewportOverflowResult = {
  viewportWidth: number
  documentScrollWidth: number
  offenders: OrbMobileViewportOverflowOffender[]
  ok: boolean
}

const ORB_MOBILE_VIEWPORT_SHELL_SELECTORS = [
  '[data-orb-shell="true"]',
  '.orb-residential-root',
  '.orb-chat-layout',
  '.orb-chat-shell',
  '.orb-chat-main',
  '.orb-chat-header',
  '.orb-mobile-chat-header',
  '[data-orb-composer="main"]',
  '.orb-composer-dock',
  '[data-orb-standalone-composer]',
  '.orb-composer-glass',
  '[data-orb-starter-cards]',
  '[data-orb-starter-card]',
  '[data-orb-empty-state]',
  '[data-orb-residential-empty]'
] as const

/** Debug/test helper: visible ORB shell nodes must not extend past the viewport width. */
export function auditOrbMobileViewportOverflow(
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390
): OrbMobileViewportOverflowResult {
  if (typeof document === 'undefined') {
    return { viewportWidth, documentScrollWidth: 0, offenders: [], ok: true }
  }

  const offenders: OrbMobileViewportOverflowOffender[] = []
  const tolerance = 1

  for (const selector of ORB_MOBILE_VIEWPORT_SHELL_SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      if (!(el instanceof HTMLElement) || !isVisibleElement(el)) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      if (rect.right > viewportWidth + tolerance || rect.width > viewportWidth + tolerance) {
        offenders.push({
          selector,
          tag: el.tagName.toLowerCase(),
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100
        })
      }
    })
  }

  const documentScrollWidth = document.documentElement.scrollWidth
  const ok =
    offenders.length === 0 && documentScrollWidth <= viewportWidth + tolerance

  return { viewportWidth, documentScrollWidth, offenders, ok }
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

export type OrbThemeAuditResult = ReturnType<typeof runOrbThemeAudit>
export type OrbOrbAuditResult = ReturnType<typeof runOrbOrbAudit>
export type OrbResidentialFullAuditResult = ReturnType<typeof runOrbResidentialFullAudit>

function reasonOrbNodeHidden(el: HTMLElement): string | null {
  const style = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  if (style.display === 'none') return 'display:none'
  if (style.visibility === 'hidden') return 'visibility:hidden'
  if (Number(style.opacity) === 0) return 'opacity:0'
  if (rect.width <= 0 || rect.height <= 0) return `zero-size:${rect.width}x${rect.height}`

  const parent = el.parentElement
  if (parent) {
    const parentStyle = window.getComputedStyle(parent)
    if (parentStyle.display === 'none') return 'parent-display:none'
    if (parentStyle.overflow === 'hidden' && rect.width > 0) {
      const parentRect = parent.getBoundingClientRect()
      if (rect.right > parentRect.right + 2 || rect.bottom > parentRect.bottom + 2) {
        return 'parent-overflow:hidden'
      }
    }
  }
  return null
}

/** Runtime theme alignment audit — html, body, shell, layout, classes, mismatches. */
export function runOrbThemeAudit(): {
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
  mismatches: string[]
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
      cssColorScheme: '',
      mismatches: ['no-document']
    }
  }

  const shell = document.querySelector('[data-orb-shell="true"]')
  const layout = document.querySelector('.orb-chat-layout--residential')
  const html = document.documentElement
  const body = document.body

  const selectedAppearance = html.dataset.orbAppearanceMode ?? html.dataset.orbAppearance ?? null
  const resolvedTheme = html.dataset.orbSystemTheme ?? html.dataset.orbTheme ?? null
  const htmlTheme = html.dataset.orbTheme ?? null
  const bodyTheme = body?.dataset.orbTheme ?? null
  const shellTheme = shell?.getAttribute('data-orb-theme') ?? null
  const layoutTheme = layout?.getAttribute('data-orb-theme') ?? null
  const mismatches: string[] = []

  if (!resolvedTheme) mismatches.push('missing resolved theme on html')
  if (htmlTheme !== resolvedTheme) mismatches.push('html data-orb-theme mismatch')
  if (bodyTheme && bodyTheme !== resolvedTheme) mismatches.push('body data-orb-theme mismatch')
  if (shellTheme && shellTheme !== resolvedTheme) mismatches.push('shell data-orb-theme mismatch')
  if (layoutTheme && layoutTheme !== resolvedTheme) mismatches.push('layout data-orb-theme mismatch')
  if (resolvedTheme && !html.classList.contains(`orb-theme-${resolvedTheme}`)) {
    mismatches.push(`html missing orb-theme-${resolvedTheme}`)
  }
  if (resolvedTheme && body && !body.classList.contains(`orb-theme-${resolvedTheme}`)) {
    mismatches.push(`body missing orb-theme-${resolvedTheme}`)
  }
  if (html.style.colorScheme && resolvedTheme && html.style.colorScheme !== resolvedTheme) {
    mismatches.push('html color-scheme mismatch')
  }

  return {
    selectedAppearance,
    resolvedTheme,
    htmlTheme,
    bodyTheme,
    shellTheme,
    layoutTheme,
    htmlClasses: html.className,
    bodyClasses: body?.className ?? '',
    shellClasses: shell?.className ?? '',
    cssColorScheme: html.style.colorScheme || '',
    mismatches
  }
}

const MOBILE_HOME_ORB_MAX_PX = 156

function rectsOverlap(a: DOMRect, b: DOMRect, padding = 4): boolean {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  )
}

function orbUsesStaticImage(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.tagName === 'IMG') {
    const src = (el as HTMLImageElement).src || ''
    return /orb-brand|orb-brand-image/i.test(src)
  }
  const bg = window.getComputedStyle(el).backgroundImage
  return /orb-brand\.png|url\(/i.test(bg) && /orb-brand/i.test(bg)
}

/** Runtime living ORB visibility audit. */
export function runOrbOrbAudit(): {
  presenceCount: number
  sphereCount: number
  visiblePresenceCount: number
  visibleSphereCount: number
  hiddenSphereCount: number
  staticImageInPresenceCount: number
  overlapsMainHeading: boolean
  homeOrbExceedsMobileMax: boolean
  failures: string[]
  spheres: Array<{
    variant: string | null
    width: number
    height: number
    display: string
    visibility: string
    opacity: string
    position: string
    usesStaticImage: boolean
    boundingBox: { x: number; y: number; width: number; height: number }
    reasonIfHidden: string | null
  }>
  nodes: Array<{
    selector: string
    display: string
    visibility: string
    opacity: string
    width: number
    height: number
    zIndex: string
    position: string
    background: string
    parentDisplay: string
    parentOverflow: string
    parentWidth: number
    parentHeight: number
    reasonIfHidden: string | null
  }>
} {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      presenceCount: 0,
      sphereCount: 0,
      visiblePresenceCount: 0,
      visibleSphereCount: 0,
      hiddenSphereCount: 0,
      staticImageInPresenceCount: 0,
      overlapsMainHeading: false,
      homeOrbExceedsMobileMax: false,
      failures: [],
      spheres: [],
      nodes: []
    }
  }

  const presenceNodes = Array.from(document.querySelectorAll('[data-orb-presence], .orb-presence'))
  const sphereNodes = Array.from(document.querySelectorAll('[data-orb-living-sphere], .orb-living-sphere'))
  const heading =
    document.querySelector('[data-orb-empty-heading-mobile]') ??
    document.querySelector('[data-orb-empty-heading]') ??
    document.querySelector('[data-orb-empty-heading-desktop]')

  const nodes = [...presenceNodes, ...sphereNodes].map((el, index) => {
    if (!(el instanceof HTMLElement)) {
      return {
        selector: `node-${index}`,
        display: '',
        visibility: '',
        opacity: '',
        width: 0,
        height: 0,
        zIndex: '',
        position: '',
        background: '',
        parentDisplay: '',
        parentOverflow: '',
        parentWidth: 0,
        parentHeight: 0,
        reasonIfHidden: 'not-html-element'
      }
    }
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const parent = el.parentElement
    const parentStyle = parent ? window.getComputedStyle(parent) : null
    const parentRect = parent?.getBoundingClientRect()
    const selector =
      el.getAttribute('data-orb-presence') != null
        ? '.orb-presence'
        : el.classList.contains('orb-living-sphere')
          ? '.orb-living-sphere'
          : el.tagName.toLowerCase()

    return {
      selector,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      zIndex: style.zIndex,
      position: style.position,
      background: style.backgroundColor,
      parentDisplay: parentStyle?.display ?? '',
      parentOverflow: parentStyle?.overflow ?? '',
      parentWidth: Math.round(parentRect?.width ?? 0),
      parentHeight: Math.round(parentRect?.height ?? 0),
      reasonIfHidden: reasonOrbNodeHidden(el)
    }
  })

  const visiblePresenceCount = presenceNodes.filter((el) => isVisibleElement(el)).length
  const visibleSphereCount = sphereNodes.filter((el) => isVisibleElement(el)).length
  const hiddenSphereCount = sphereNodes.length - visibleSphereCount

  let overlapsMainHeading = false
  let homeOrbExceedsMobileMax = false
  const headingRect = heading instanceof HTMLElement ? heading.getBoundingClientRect() : null

  const spheres = sphereNodes.map((el) => {
    if (!(el instanceof HTMLElement)) {
      return {
        variant: null,
        width: 0,
        height: 0,
        display: '',
        visibility: '',
        opacity: '',
        position: '',
        usesStaticImage: false,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        reasonIfHidden: 'not-html-element'
      }
    }
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const presence = el.closest('[data-orb-presence]')
    const variant = presence?.getAttribute('data-orb-presence-variant') ?? null
    const visible = isVisibleElement(el)

    if (visible && headingRect && rectsOverlap(rect, headingRect)) {
      overlapsMainHeading = true
    }

    if (
      visible &&
      variant === 'hero' &&
      window.innerWidth < 768 &&
      Math.max(rect.width, rect.height) > MOBILE_HOME_ORB_MAX_PX + 2
    ) {
      homeOrbExceedsMobileMax = true
    }

    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    const aspectDelta = Math.abs(width - height)
    const looksSquareArtifact =
      visible && aspectDelta <= 2 && (width > 48 || height > 48) && style.backgroundColor === 'rgb(0, 0, 0)'

    return {
      variant,
      width,
      height,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      position: style.position,
      usesStaticImage: orbUsesStaticImage(el) || Boolean(presence?.querySelector('img[src*="orb-brand"]')),
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height
      },
      reasonIfHidden: reasonOrbNodeHidden(el) ?? (looksSquareArtifact ? 'square-black-artifact' : null)
    }
  })

  const staticImageInPresenceCount = presenceNodes.filter((el) => {
    if (!(el instanceof HTMLElement)) return false
    return Array.from(el.querySelectorAll('img')).some((img) => orbUsesStaticImage(img))
  }).length

  const failures: string[] = []
  if (visibleSphereCount === 0) failures.push('no visible living sphere')
  if (staticImageInPresenceCount > 0) failures.push('orb presence uses static brand image')
  if (overlapsMainHeading) failures.push('orb overlaps main heading')
  if (homeOrbExceedsMobileMax) failures.push(`home orb exceeds mobile max (${MOBILE_HOME_ORB_MAX_PX}px)`)
  for (const sphere of spheres) {
    if (sphere.reasonIfHidden === 'square-black-artifact') {
      failures.push('rectangular/square orb artifact detected')
      break
    }
  }

  if (failures.length) {
    console.error('[ORB_ORB_AUDIT] failures:', failures, { spheres, nodes })
  }

  return {
    presenceCount: presenceNodes.length,
    sphereCount: sphereNodes.length,
    visiblePresenceCount,
    visibleSphereCount,
    hiddenSphereCount,
    staticImageInPresenceCount,
    overlapsMainHeading,
    homeOrbExceedsMobileMax,
    failures,
    spheres,
    nodes
  }
}

/** Desktop layout audit — viewport, sidebar, max-width containers, orb overlap, mobile class leaks. */
export function runOrbDesktopLayoutAudit(): OrbDesktopLayoutAuditResult {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      viewportWidth: 0,
      viewportHeight: 0,
      sidebarWidth: null,
      mainContentWidth: null,
      activeRoute: null,
      activeWorkspacePanel: null,
      maxWidthContainers: [],
      orbPresenceBoundingBox: null,
      headingBoundingBox: null,
      overlapWarnings: [],
      elementsExceedingViewport: [],
      mobileOnlyClassesActiveOnDesktop: [],
      staticOrbImageCount: 0,
      visibleLivingSphereCount: 0,
      composerVisibleOnHomeChat: true,
      sidebarScrollContainerExists: true,
      accountFooterReachable: true,
      horizontalOverflow: false,
      activeContentFitsViewport: true,
      themeMismatchCount: 0,
      ok: true
    }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isDesktop = viewportWidth >= 1024

  const sidebar = document.querySelector('.orb-chat-sidebar')
  const sidebarRect = sidebar instanceof HTMLElement ? sidebar.getBoundingClientRect() : null

  const main = document.querySelector('.orb-chat-main')
  const mainRect = main instanceof HTMLElement ? main.getBoundingClientRect() : null

  const workspacePanel = document.querySelector('[data-orb-workspace-panel]')
  const activeWorkspacePanel = workspacePanel?.getAttribute('data-orb-workspace-panel') ?? null

  const activeRoute =
    activeWorkspacePanel ??
    (document.querySelector('[data-orb-residential-empty]') ? 'home' : null) ??
    window.location.pathname

  const containerSelectors = [
    '[data-orb-settings-panel]',
    '[data-orb-document-panel]',
    '[data-orb-shift-builder-panel]',
    '[data-orb-saved-outputs-panel]',
    '[data-orb-dictate-station]',
    '[data-orb-voice-desktop]',
    '[data-orb-skills-panel]',
    '[data-orb-templates-panel]',
    '[data-orb-knowledge-library]',
    '[data-orb-residential-empty]'
  ]

  const maxWidthContainers = containerSelectors.flatMap((selector) => {
    const el = document.querySelector(selector)
    if (!(el instanceof HTMLElement) || !isVisibleElement(el)) return []
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return [
      {
        selector,
        maxWidth: style.maxWidth,
        width: Math.round(rect.width)
      }
    ]
  })

  const presence =
    document.querySelector('[data-orb-presence-slot="hero"] .orb-living-sphere') ??
    document.querySelector('.orb-presence--hero .orb-living-sphere') ??
    document.querySelector('[data-orb-presence] .orb-living-sphere')

  const heading =
    document.querySelector('[data-orb-empty-heading-desktop]') ??
    document.querySelector('[data-orb-empty-heading-mobile]') ??
    document.querySelector('[data-orb-empty-heading]')

  const orbRect = presence instanceof HTMLElement ? presence.getBoundingClientRect() : null
  const headingRect = heading instanceof HTMLElement ? heading.getBoundingClientRect() : null

  const overlapWarnings: string[] = []
  if (orbRect && headingRect && rectsOverlap(orbRect, headingRect)) {
    overlapWarnings.push('orb overlaps main heading')
  }

  const emotionalLine = document.querySelector('[data-orb-empty-emotional-line]')
  if (orbRect && emotionalLine instanceof HTMLElement) {
    const lineRect = emotionalLine.getBoundingClientRect()
    if (rectsOverlap(orbRect, lineRect)) {
      overlapWarnings.push('orb overlaps emotional tagline')
    }
  }

  const elementsExceedingViewport: string[] = []
  const layoutRoot =
    document.querySelector('.orb-chat-layout--residential') ?? document.documentElement
  for (const el of Array.from(layoutRoot.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement) || !isVisibleElement(el)) continue
    const rect = el.getBoundingClientRect()
    if (rect.right > viewportWidth + 2) {
      const marker =
        el.getAttribute('data-orb-workspace-panel') ??
        el.getAttribute('data-orb-settings-panel') ??
        (el.className.toString().slice(0, 48) || el.tagName.toLowerCase())
      elementsExceedingViewport.push(String(marker))
      if (elementsExceedingViewport.length >= 8) break
    }
  }

  const mobileOnlyClassesActiveOnDesktop: string[] = []
  if (isDesktop) {
    const mobileBranchActive = document.querySelectorAll('[data-orb-mobile-branch="active"]').length
    if (mobileBranchActive > 0) {
      mobileOnlyClassesActiveOnDesktop.push(`data-orb-mobile-branch active (${mobileBranchActive})`)
    }
    const mobileNavVisible = Array.from(
      document.querySelectorAll('[data-orb-settings-nav-mobile], [data-orb-sidebar-mobile-quick-nav]')
    ).filter(isVisibleElement)
    if (mobileNavVisible.length > 0) {
      mobileOnlyClassesActiveOnDesktop.push('mobile-only nav visible on desktop')
    }
  }

  const staticOrbImageCount = Array.from(document.querySelectorAll('img')).filter((img) =>
    orbUsesStaticImage(img)
  ).length

  const visibleLivingSphereCount = Array.from(
    document.querySelectorAll('.orb-living-sphere, [data-orb-living-sphere]')
  ).filter(isVisibleElement).length

  const composerDock = document.querySelector('[data-orb-composer="main"]')
  const composerRect = composerDock instanceof HTMLElement ? composerDock.getBoundingClientRect() : null
  const composerStyle = composerDock instanceof HTMLElement ? window.getComputedStyle(composerDock) : null
  const onHomeOrChat =
    Boolean(document.querySelector('[data-orb-residential-empty]')) || activeWorkspacePanel === null
  const composerVisibleOnHomeChat =
    !isDesktop ||
    !onHomeOrChat ||
    (composerRect !== null &&
      composerStyle !== null &&
      composerStyle.display !== 'none' &&
      composerStyle.visibility !== 'hidden' &&
      Number(composerStyle.opacity) > 0.05 &&
      composerRect.height > 8 &&
      composerRect.bottom <= viewportHeight + 2 &&
      composerRect.top < viewportHeight - 4)

  const sidebarScroll = document.querySelector('[data-orb-sidebar-scroll]')
  const sidebarScrollContainer = document.querySelector('[data-orb-sidebar-scroll-container]')
  const sidebarScrollContainerExists = Boolean(sidebarScroll && sidebarScrollContainer)

  const accountFooter = document.querySelector('[data-orb-sidebar-account-footer]')
  const accountFooterRect =
    accountFooter instanceof HTMLElement ? accountFooter.getBoundingClientRect() : null
  const accountFooterReachable =
    !isDesktop ||
    (accountFooterRect !== null &&
      accountFooterRect.bottom <= viewportHeight + 2 &&
      accountFooterRect.top < viewportHeight - 8)

  const horizontalOverflow =
    document.documentElement.scrollWidth > viewportWidth + 2 ||
    (layoutRoot instanceof HTMLElement && layoutRoot.scrollWidth > viewportWidth + 2)

  const activePanelEl = document.querySelector('[data-orb-workspace-panel]')
  let activeContentFitsViewport = true
  if (isDesktop && activePanelEl instanceof HTMLElement && isVisibleElement(activePanelEl)) {
    const panelRect = activePanelEl.getBoundingClientRect()
    const body = activePanelEl.querySelector('.orb-workspace-body')
    const bodyStyle = body instanceof HTMLElement ? window.getComputedStyle(body) : null
    const panelOverflows =
      panelRect.bottom > viewportHeight + 4 && bodyStyle?.overflowY !== 'auto' && bodyStyle?.overflowY !== 'scroll'
    activeContentFitsViewport = !panelOverflows || bodyStyle?.overflowY === 'auto' || bodyStyle?.overflowY === 'scroll'
  }

  const themeAudit = runOrbDesktopThemeAudit()
  const themeMismatchCount =
    (themeAudit.shellTheme && themeAudit.htmlOrbTheme && themeAudit.shellTheme !== themeAudit.htmlOrbTheme
      ? 1
      : 0) +
    (themeAudit.layoutTheme && themeAudit.shellTheme && themeAudit.layoutTheme !== themeAudit.shellTheme ? 1 : 0) +
    (!themeAudit.ok && themeAudit.residentialFlag ? 1 : 0)

  const failures: string[] = [...overlapWarnings]
  if (elementsExceedingViewport.length) failures.push('elements exceed viewport width')
  if (isDesktop && mobileOnlyClassesActiveOnDesktop.length) {
    failures.push('mobile-only classes active on desktop')
  }
  if (staticOrbImageCount > 0) failures.push('static orb PNG detected in product UI')
  if (isDesktop && onHomeOrChat && !composerVisibleOnHomeChat) {
    failures.push('composer not visible on home/chat')
  }
  if (isDesktop && !sidebarScrollContainerExists) {
    failures.push('sidebar scroll container missing')
  }
  if (isDesktop && !accountFooterReachable) {
    failures.push('account/workspace footer not reachable')
  }
  if (horizontalOverflow) failures.push('horizontal overflow on document')
  if (isDesktop && !activeContentFitsViewport) {
    failures.push('active workspace content exceeds viewport without scroll')
  }
  if (themeMismatchCount > 0) failures.push('theme mismatch detected')

  if (failures.length) {
    console.warn('[ORB_DESKTOP_LAYOUT_AUDIT] issues:', failures)
  }

  return {
    viewportWidth,
    viewportHeight,
    sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : null,
    mainContentWidth: mainRect ? Math.round(mainRect.width) : null,
    activeRoute,
    activeWorkspacePanel,
    maxWidthContainers,
    orbPresenceBoundingBox: orbRect
      ? {
          x: Math.round(orbRect.x),
          y: Math.round(orbRect.y),
          width: Math.round(orbRect.width),
          height: Math.round(orbRect.height)
        }
      : null,
    headingBoundingBox: headingRect
      ? {
          x: Math.round(headingRect.x),
          y: Math.round(headingRect.y),
          width: Math.round(headingRect.width),
          height: Math.round(headingRect.height)
        }
      : null,
    overlapWarnings,
    elementsExceedingViewport,
    mobileOnlyClassesActiveOnDesktop,
    staticOrbImageCount,
    visibleLivingSphereCount,
    composerVisibleOnHomeChat,
    sidebarScrollContainerExists,
    accountFooterReachable,
    horizontalOverflow,
    activeContentFitsViewport,
    themeMismatchCount,
    ok: failures.length === 0
  }
}

export function runOrbResidentialFullAudit(): {
  theme: ReturnType<typeof runOrbThemeAudit>
  orb: ReturnType<typeof runOrbOrbAudit>
  viewport: OrbMobileViewportOverflowResult
} {
  return {
    theme: runOrbThemeAudit(),
    orb: runOrbOrbAudit(),
    viewport: auditOrbMobileViewportOverflow()
  }
}

export function registerOrbUiAuditGlobals(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & {
    ORB_UI_AUDIT?: () => OrbUiAuditResult
    ORB_DESKTOP_THEME_AUDIT?: () => OrbDesktopThemeAuditResult
    ORB_DESKTOP_LAYOUT_AUDIT?: () => OrbDesktopLayoutAuditResult
    ORB_UI_HIT_TEST?: (selectorOrText: string) => OrbUiHitTestResult
    ORB_UI_DUPLICATES?: () => ReturnType<typeof runOrbUiDuplicates>
    ORB_MOBILE_VIEWPORT_AUDIT?: () => OrbMobileViewportOverflowResult
    ORB_THEME_AUDIT?: () => ReturnType<typeof runOrbThemeAudit>
    ORB_ORB_AUDIT?: () => ReturnType<typeof runOrbOrbAudit>
    ORB_RESIDENTIAL_FULL_AUDIT?: () => ReturnType<typeof runOrbResidentialFullAudit>
  }
  w.ORB_UI_AUDIT = runOrbUiAudit
  w.ORB_DESKTOP_THEME_AUDIT = runOrbDesktopThemeAudit
  w.ORB_DESKTOP_LAYOUT_AUDIT = runOrbDesktopLayoutAudit
  w.ORB_UI_HIT_TEST = runOrbUiHitTest
  w.ORB_UI_DUPLICATES = runOrbUiDuplicates
  w.ORB_MOBILE_VIEWPORT_AUDIT = auditOrbMobileViewportOverflow
  w.ORB_THEME_AUDIT = runOrbThemeAudit
  w.ORB_ORB_AUDIT = runOrbOrbAudit
  w.ORB_RESIDENTIAL_FULL_AUDIT = runOrbResidentialFullAudit
}
