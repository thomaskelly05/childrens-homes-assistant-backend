/**
 * Interaction route and tap audit — static checks for mobile nav, workspace hrefs,
 * ORB composer submit/error markers, and overlay pointer-events guard rails.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
  BROWSER_INTERACTION_AUDIT_SNIPPET,
  classifyControlViewport,
  isBottomNavFalsePositive,
  summariseInteractionCoverage
} from './interaction-coverage-audit-logic.mjs'

const root = process.cwd()
const appDir = join(root, 'app')
const problems = []

function file(path) {
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) throw new Error(`Missing file: ${path}`)
  return readFileSync(fullPath, 'utf8')
}

function check(name, condition) {
  if (!condition) problems.push(name)
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (['.next', 'node_modules', '.git'].includes(entry)) return []
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function routeFromPage(path) {
  const route = relative(appDir, path)
    .replace(/\/page\.tsx$/, '')
    .replace(/\/page\.ts$/, '')
    .replace(/^page\.(tsx|ts)$/, '')
    .replace(/\\/g, '/')
  return route === '' ? '/' : `/${route}`
}

function normaliseRoute(route) {
  return route.replace(/\[[^\]]+\]/g, ':param').replace(/\/+$/, '') || '/'
}

function hrefToRoute(href) {
  const clean = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  return clean.replace(/\/[^/]+(?=\/|$)/g, (segment) => {
    if (/^\d+$/.test(segment.slice(1))) return '/:param'
    if (/^(yp-|staff-|inc-|log-|safe-|risk-|med-|key-|apt-|doc-|rep-|act-|ev-|reg)/.test(segment.slice(1))) {
      return '/:param'
    }
    return segment
  })
}

function routeExists(href, routes) {
  const clean = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  if (routes.has(clean)) return true
  const route = hrefToRoute(href)
  const routeParts = route.split('/').filter(Boolean)
  return (
    routes.has(route) ||
    routes.has(normaliseRoute(route)) ||
    [...routes].some((candidate) => {
      const parts = candidate.split('/').filter(Boolean)
      return parts.length === routeParts.length && parts.every((part, index) => part === ':param' || part === routeParts[index])
    })
  )
}

const pageFiles = walk(appDir).filter((path) => /\/page\.(tsx|ts)$/.test(path))
const routes = new Set(pageFiles.map((path) => normaliseRoute(routeFromPage(path))))

const mobileBottomNav = file('components/indicare/mobile/mobile-bottom-nav.tsx')
const interactionGuard = file('app/interaction-guard.css')
const orbStandaloneComposer = file('components/orb-standalone/orb-standalone-composer.tsx')
const orbCareCompanion = file('components/orb-standalone/orb-care-companion.tsx')
const orbOperational = file('components/orb-operational/orb-conversation-experience.tsx')
const appShell = file('components/indicare/app-shell.tsx')
const osAppProviders = file('components/indicare/scope/os-app-providers.tsx')
const scopeRoutes = file('lib/navigation/scope-routes.ts')

check('interaction-guard.css is imported from app/layout.tsx', file('app/layout.tsx').includes("import './interaction-guard.css'"))

const navigationRescue = file('components/indicare/navigation/navigation-rescue.tsx')
const rootLayout = file('app/layout.tsx')
check(
  'NavigationRescue is loaded from app/layout.tsx for stalled client-nav fallback',
  rootLayout.includes('NavigationRescue') &&
    rootLayout.includes('navigation-rescue') &&
    navigationRescue.includes('window.location.assign') &&
    navigationRescue.includes('capture: true') &&
    navigationRescue.includes('data-no-navigation-rescue')
)

check(
  'home bottom nav avoids non-existent /homes/:id/recording-* routes',
  !mobileBottomNav.includes('/recording-alerts') && !mobileBottomNav.includes('/recording-reviews')
)
check(
  'home bottom nav alerts use /record/alerts?home_id=',
  mobileBottomNav.includes('homeRecordingAlertsHref(homeId)') && scopeRoutes.includes("return `/record/alerts?home_id=${enc(homeId)}`")
)
check(
  'home bottom nav reviews use /record/reviews?home_id=',
  mobileBottomNav.includes('homeRecordingReviewsHref(homeId)') && scopeRoutes.includes("return `/record/reviews?home_id=${enc(homeId)}`")
)
check(
  'home bottom nav simplified (handover + more, ORB in workspace more section)',
  mobileBottomNav.includes('homeHandoverHref(homeId)') &&
    mobileBottomNav.includes('mobile-nav-more') &&
    !mobileBottomNav.includes('homeOrbHref(homeId)')
)

check(
  'mobile bottom nav uses explicit height not max-h overlay',
  mobileBottomNav.includes("height: 'calc(4.5rem + env(safe-area-inset-bottom))'") &&
    !mobileBottomNav.includes('max-h-[') &&
    mobileBottomNav.includes('z-40')
)
check(
  'mobile bottom nav does not use full viewport fixed inset overlay',
  !(mobileBottomNav.includes('fixed inset-0') || mobileBottomNav.includes('inset-0 bottom-0 top-0'))
)
check(
  'mobile drawer z-index above bottom nav',
  file('components/indicare/mobile/mobile-os-top-bar.tsx').includes('z-[70]') &&
    mobileBottomNav.includes('z-40')
)
check(
  'mobile workspace bottom padding uses 7rem safe area',
  file('lib/navigation/mobile-shell.ts').includes('pb-[calc(7rem+env(safe-area-inset-bottom))]') &&
    file('app/globals.css').includes('padding-bottom: calc(7rem + env(safe-area-inset-bottom))')
)
check(
  'bottom nav hidden on select-scope',
  file('lib/navigation/mobile-shell.ts').includes("pathname === '/select-scope'")
)
check(
  'interaction coverage audit avoids clamping offscreen centres',
  BROWSER_INTERACTION_AUDIT_SNIPPET.includes('offscreen_not_tested') &&
    !BROWSER_INTERACTION_AUDIT_SNIPPET.includes('innerHeight - 1')
)
check(
  'interaction coverage logic classifies viewport without clamp',
  classifyControlViewport({ x: 10, y: 9000 }, { width: 390, height: 844 }) === 'offscreen_not_tested' &&
    isBottomNavFalsePositive('<nav class="mobile-bottom-nav">', {
      blocked: true,
      viewportStatus: 'offscreen_not_tested'
    }) === true &&
    summariseInteractionCoverage(
      [
        { centre: { x: 10, y: 9000 }, blocked: true, topElement: '<nav class="mobile-bottom-nav">' },
        { centre: { x: 10, y: 40 }, blocked: false }
      ],
      { width: 390, height: 844 }
    ).blockedOrSuspicious === 0
)

const childWorkflowSample = {
  workspace: '/young-people/42/workspace',
  record: '/record?child_id=42',
  dailyNote: '/record?child_id=42&type=daily-note',
  reviews: '/record/reviews?child_id=42',
  alerts: '/record/alerts?child_id=42',
  orb: '/assistant/orb?scope=child&young_person_id=42&mode=record_quality_review',
  chronology: '/young-people/42/chronology',
  archive: '/young-people/42/archive',
  actions: '/actions?child_id=42',
  documents: '/young-people/42/documents',
  handover: '/handover?child_id=42'
}

const homeWorkflowSample = {
  workspace: '/homes/7/workspace',
  dailyBrief: '/command-centre/briefing?home_id=7',
  handover: '/handover?home_id=7',
  recordingAlerts: '/record/alerts?home_id=7',
  recordingReviews: '/record/reviews?home_id=7',
  safeguarding: '/safeguarding?home_id=7',
  notifications: '/notifications?home_id=7',
  staffOnShift: '/shifts/current?home_id=7',
  workforce: '/staff?home_id=7',
  actions: '/actions?home_id=7',
  inspectionReadiness: '/intelligence/inspection-readiness?home_id=7',
  sccif: '/intelligence/sccif?home_id=7',
  reg44: '/intelligence/inspection-readiness?home_id=7&pack=reg44',
  reg45: '/intelligence/reg45?home_id=7',
  reports: '/reports?home_id=7',
  orb: '/assistant/orb?scope=home&home_id=7&mode=manager_daily_brief',
  children: '/select-scope'
}

for (const [key, href] of Object.entries(childWorkflowSample)) {
  if (!routeExists(href, routes)) {
    problems.push(`invalid child shortcut href (${key}): ${href}`)
  }
}

for (const [key, href] of Object.entries(homeWorkflowSample)) {
  if (!routeExists(href, routes)) {
    problems.push(`invalid home shortcut href (${key}): ${href}`)
  }
}

const sourceFiles = walk(root).filter(
  (path) => /\.(tsx|ts|jsx|js)$/.test(path) && !path.includes('/.next/') && !path.includes('/node_modules/')
)

for (const path of sourceFiles) {
  const text = readFileSync(path, 'utf8')
  const rel = relative(root, path)
  if (/\bhref\s*=\s*["']#["']/.test(text) || /\bhref\s*=\s*\{\s*["']#["']\s*\}/.test(text)) {
    problems.push(`primary href is #: ${rel}`)
  }
  if (/\bhref\s*=\s*["']["']/.test(text) || /\bhref\s*=\s*\{\s*["']["']\s*\}/.test(text)) {
    problems.push(`empty href: ${rel}`)
  }
}

check('/orb composer uses form onSubmit', orbStandaloneComposer.includes('<form') && orbStandaloneComposer.includes('onSubmit'))
check('/orb composer send is type="submit"', orbStandaloneComposer.includes('type="submit"') && orbStandaloneComposer.includes('data-testid="orb-standalone-send-clickable"'))
check(
  '/orb composer is controlled single-source',
  orbStandaloneComposer.includes('value={value}') &&
    orbStandaloneComposer.includes('data-input-source="controlled"') &&
    orbCareCompanion.includes('value={message}') &&
    orbCareCompanion.includes('onChange={handleMessageChange}')
)
check('/orb has visible send error marker', orbCareCompanion.includes('data-testid="orb-send-error"'))

check(
  '/assistant/orb composer uses form onSubmit',
  orbOperational.includes('<form') && orbOperational.includes('onSubmit') && orbOperational.includes('void submit(event)')
)
check(
  '/assistant/orb send is type="submit"',
  orbOperational.includes('type="submit"') && orbOperational.includes('data-testid="orb-operational-send-clickable"')
)
check('/assistant/orb has visible send error marker', orbOperational.includes('data-testid="orb-operational-send-error"'))

check(
  '/assistant/orb renders without OS shell wrapper',
  appShell.includes('isOperationalOrbPage') &&
    appShell.includes('if (isStandaloneOrb || isOperationalOrbPage || isStandaloneAssistantRoute)')
)

check(
  '/orb bypasses OsAppProviders scope stack',
  osAppProviders.includes('isStandaloneOrbSurfaceRoute') &&
    osAppProviders.includes('if (isStandaloneOrbSurfaceRoute(pathname))') &&
    osAppProviders.includes('return <>{children}</>')
)

check(
  '/orb standalone client POST uses CSRF headers',
  file('lib/orb/standalone-client.ts').includes('applyCsrfHeaders') &&
    file('lib/orb/standalone-client.ts').includes("credentials: 'include'") &&
    file('lib/auth/api.ts').includes('X-CSRF-Token')
)

check(
  '/orb shows CSRF session security message',
  orbCareCompanion.includes('STANDALONE_ORB_CSRF_REFRESH_MESSAGE') &&
    orbCareCompanion.includes('csrfReady')
)

const decorativeClasses = [
  'orb-screen-edge-pulse',
  'orb-atmospheric-diffusion',
  'orb-overlay-shell',
  'orb-cinematic-light-field',
  'orb-neural-haze',
  "[data-orb-floating-dock='true']"
]

for (const cls of decorativeClasses) {
  check(`interaction guard blocks decorative layer: ${cls}`, interactionGuard.includes(cls) && interactionGuard.includes('pointer-events: none'))
}

const overlayAllowlist = [
  'mobile-menu-overlay',
  'mobile-menu-backdrop',
  'mobile-menu-drawer',
  'mobile-bottom-nav',
  'orb-panel-overlay',
  'orb-operational-composer',
  'orb-chat-composer',
  'role="dialog"',
  'aria-modal="true"',
  'onClick={onClose}',
  'onClick={() => setOpen(false)}',
  'onClick={() => setSidebarOpen(false)}',
  'pointer-events-none',
  'pointer-events-auto',
  'orb-overlay-interactive',
  'orb-embedded-dock',
  'orb-standalone-atmosphere'
]

for (const path of sourceFiles.filter((p) => p.endsWith('.tsx'))) {
  const text = readFileSync(path, 'utf8')
  const rel = relative(root, path)
  if (!text.includes('fixed') || !text.includes('inset-0')) continue
  const gatedOverlay = text.includes('if (!open) return null') || text.includes('{open ? (')
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    if (!line.includes('fixed') || !line.includes('inset-0')) return
    const context = lines.slice(Math.max(0, index - 2), index + 3).join('\n')
    if (overlayAllowlist.some((token) => line.includes(token) || context.includes(token))) return
    if (line.includes('pointer-events-none')) return
    if (gatedOverlay) return
    problems.push(`fixed inset-0 overlay may block clicks (${rel}:${index + 1}): ${line.trim().slice(0, 120)}`)
  })
}

if (problems.length) {
  console.error('Interaction audit failed:')
  problems.forEach((problem) => console.error(`- ${problem}`))
  process.exit(1)
}

console.log('Interaction audit passed.')
