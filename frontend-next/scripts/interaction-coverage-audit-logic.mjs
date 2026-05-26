/**
 * Viewport-aware interaction coverage helpers for browser/console audits.
 * Do not clamp offscreen control centres into the viewport — that falsely attributes
 * coverage to fixed bottom nav.
 */

/**
 * @param {{ x: number, y: number }} centre
 * @param {{ width: number, height: number }} viewport
 */
export function classifyControlViewport(centre, viewport) {
  const { width, height } = viewport
  if (centre.y < 0 || centre.y > height || centre.x < 0 || centre.x > width) {
    return 'offscreen_not_tested'
  }
  return 'visible_in_viewport'
}

/**
 * @param {string | null | undefined} topElementDescription
 * @param {{ blocked?: boolean, viewportStatus?: string }} options
 */
export function isBottomNavFalsePositive(topElementDescription, options = {}) {
  const { blocked = false, viewportStatus = 'visible_in_viewport' } = options
  if (!blocked) return false
  if (viewportStatus === 'offscreen_not_tested') return true
  if (!topElementDescription || !topElementDescription.includes('mobile-bottom-nav')) return false
  return viewportStatus !== 'visible_in_viewport'
}

/**
 * @param {Array<{ centre: { x: number, y: number }, blocked?: boolean, topElement?: string }>} controls
 * @param {{ width: number, height: number }} viewport
 */
export function summariseInteractionCoverage(controls, viewport) {
  const visibleInViewport = []
  const offscreenNotTested = []
  const blockedOrSuspicious = []

  for (const control of controls) {
    const viewportStatus = classifyControlViewport(control.centre, viewport)
    if (viewportStatus === 'offscreen_not_tested') {
      offscreenNotTested.push(control)
      continue
    }
    visibleInViewport.push(control)
    if (
      control.blocked &&
      !isBottomNavFalsePositive(control.topElement, { blocked: true, viewportStatus })
    ) {
      blockedOrSuspicious.push(control)
    }
  }

  return {
    visibleInViewport: visibleInViewport.length,
    offscreenNotTested: offscreenNotTested.length,
    blockedOrSuspicious: blockedOrSuspicious.length
  }
}

/**
 * Paste into DevTools console on a workspace page (non-production debugging).
 */
export const BROWSER_INTERACTION_AUDIT_SNIPPET = String.raw`(() => {
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  const nav = document.querySelector('[data-testid="mobile-child-bottom-nav"],[data-testid="mobile-home-bottom-nav"],[data-testid="mobile-bottom-nav"]')
  const navRect = nav?.getBoundingClientRect()
  const selectors = 'a[href],button:not([disabled]),[role="button"]:not([aria-disabled="true"])'
  const controls = [...document.querySelectorAll(selectors)].filter((el) => {
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }).map((el) => {
    const rect = el.getBoundingClientRect()
    const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const inViewport = centre.y >= 0 && centre.y <= viewport.height && centre.x >= 0 && centre.x <= viewport.width
    const top = inViewport ? document.elementFromPoint(centre.x, centre.y) : null
    const topElement = top ? top.outerHTML.slice(0, 160) : null
    const blocked =
      inViewport &&
      top &&
      !el.contains(top) &&
      !top.contains(el) &&
      !(nav && (nav === top || nav.contains(top)))
    return {
      testId: el.getAttribute('data-testid'),
      href: el.getAttribute('href'),
      centre,
      viewportStatus: inViewport ? 'visible_in_viewport' : 'offscreen_not_tested',
      blocked,
      topElementAtCentre: topElement
    }
  })
  const visible = controls.filter((c) => c.viewportStatus === 'visible_in_viewport')
  const blocked = visible.filter((c) => c.blocked)
  console.table({
    visibleButtons: visible.filter((c) => c.testId || (c.href && c.href !== '#')).length,
    visibleLinks: visible.filter((c) => c.href).length,
    offscreenNotTested: controls.filter((c) => c.viewportStatus === 'offscreen_not_tested').length,
    blockedOrSuspiciousControls: blocked.length,
    possibleFullScreenOverlays: [...document.querySelectorAll('.fixed.inset-0')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width >= viewport.width * 0.9 && r.height >= viewport.height * 0.9
    }).length,
    mobileBottomNavHeight: navRect ? Math.round(navRect.height) : null
  })
  return { controls, visible, blocked, navRect }
})()`
