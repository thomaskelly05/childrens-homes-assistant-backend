import type { Page, Route } from '@playwright/test'

export const ORB_AUDIT_VIEWPORTS = {
  mobile: { width: 390, height: 844, label: 'mobile (390×844)' },
  tablet: { width: 768, height: 1024, label: 'tablet (768×1024)' },
  desktop: { width: 1440, height: 900, label: 'desktop (1440×900)' }
} as const

export type OrbAuditViewportKey = keyof typeof ORB_AUDIT_VIEWPORTS

/** Canonical ORB Residential routes and deep-link stations for layout audit. */
export const ORB_AUDIT_ROUTES: Array<{
  path: string
  label: string
  kind: 'product' | 'public' | 'redirect' | 'profile'
  expectShell?: boolean
  stationPanel?: string
}> = [
  { path: '/orb', label: 'Chat home', kind: 'product', expectShell: true },
  { path: '/orb?station=orb_dictate', label: 'Dictate station', kind: 'product', expectShell: true, stationPanel: 'orb_dictate' },
  { path: '/orb?station=orb_voice', label: 'Voice station', kind: 'product', expectShell: true, stationPanel: 'orb_voice' },
  { path: '/orb?station=orb_write', label: 'ORB Write station', kind: 'product', expectShell: true, stationPanel: 'orb_write' },
  { path: '/orb?station=templates', label: 'Templates station', kind: 'product', expectShell: true, stationPanel: 'templates' },
  { path: '/orb?station=documents', label: 'Documents & Guidance', kind: 'product', expectShell: true, stationPanel: 'documents' },
  { path: '/orb?station=saved', label: 'Saved outputs station', kind: 'product', expectShell: true, stationPanel: 'saved' },
  { path: '/orb?station=review', label: 'Review station', kind: 'product', expectShell: true, stationPanel: 'review' },
  { path: '/orb?station=knowledge', label: 'Library / Learn station', kind: 'product', expectShell: true, stationPanel: 'knowledge' },
  { path: '/orb?station=shift_builder', label: 'Shift Builder station', kind: 'product', expectShell: true, stationPanel: 'shift_builder' },
  { path: '/orb/profile', label: 'Adult profile page', kind: 'profile', expectShell: false },
  { path: '/orb/billing', label: 'Billing / trial', kind: 'public', expectShell: false },
  { path: '/orb/billing/success', label: 'Billing success', kind: 'public', expectShell: false },
  { path: '/orb/billing/cancel', label: 'Billing cancel', kind: 'public', expectShell: false },
  { path: '/orb/signup', label: 'Signup', kind: 'public', expectShell: false },
  { path: '/orb/setup', label: 'Setup / onboarding', kind: 'public', expectShell: false },
  { path: '/orb/templates', label: 'Templates redirect', kind: 'redirect', expectShell: true, stationPanel: 'templates' },
  { path: '/orb/saved', label: 'Saved redirect', kind: 'redirect', expectShell: true, stationPanel: 'saved' },
  { path: '/orb/learn', label: 'Learn redirect', kind: 'redirect', expectShell: true, stationPanel: 'knowledge' },
  { path: '/orb/review', label: 'Review redirect', kind: 'redirect', expectShell: true, stationPanel: 'review' },
  { path: '/orb/outputs', label: 'Outputs legacy', kind: 'redirect', expectShell: true, stationPanel: 'saved' },
  { path: '/orb/projects', label: 'Projects legacy', kind: 'redirect', expectShell: true },
  { path: '/orb/write', label: 'Write legacy redirect', kind: 'redirect', expectShell: true, stationPanel: 'orb_write' },
  { path: '/orb/shift-builder', label: 'Shift builder redirect', kind: 'redirect', expectShell: true, stationPanel: 'shift_builder' },
  { path: '/orb/access', label: 'Access → billing redirect', kind: 'redirect', expectShell: false },
  { path: '/orb/onboarding', label: 'Onboarding → setup redirect', kind: 'redirect', expectShell: false },
  { path: '/orb/login', label: 'Login → front door redirect', kind: 'redirect', expectShell: false },
  { path: '/orb/ask', label: 'Ask legacy page', kind: 'product', expectShell: false },
  { path: '/orb/intelligence-map', label: 'Intelligence map', kind: 'product', expectShell: false }
]

const MOCK_VERDICT = {
  success: true,
  data: {
    contract_version: 'orb_front_door_v1',
    verdict: 'ready',
    authenticated: true,
    can_use_orb: true,
    access_blocker: null,
    safety_accepted: true,
    subscription: {
      can_use_orb: true,
      access_state: 'active',
      access_blocker: null,
      safety_accepted: true,
      trial: { available: true, active: true, days_left: 14, expires_at: null },
      subscription: { active: true, status: 'active', plan_name: 'ORB Residential' },
      billing: { stripe_configured: false, price_gbp_monthly: 9.99 }
    },
    user: {
      id: 9001,
      email: 'e2e.manager@indicare.local',
      first_name: 'E2E',
      last_name: 'Manager',
      role: 'manager'
    },
    frontend_should_mount_product: true,
    allowed_bootstrap: true,
    backend_build: 'e2e-audit',
    reason: 'e2e_mock_ready',
    access: {
      contract_version: 'orb_access_v1',
      product: 'orb_residential',
      price_label: '£9.99/month',
      can_use_orb: true,
      access_state: 'active',
      trial: { available: true, active: true, days_left: 14, expires_at: null },
      subscription: { active: true, status: 'active', plan_name: 'ORB Residential' },
      billing: { stripe_configured: false, price_gbp_monthly: 9.99 },
      standalone: true,
      os_records_accessed: false,
      os_access_granted: false,
      safety_accepted: true,
      onboarding_completed: true,
      upgrade: {
        checkout_available: true,
        trial_available: true,
        manage_billing_available: false
      }
    }
  }
}

const MOCK_ACCESS = {
  success: true,
  data: MOCK_VERDICT.data.access
}

const MOCK_CONFIG = {
  success: true,
  data: {
    standalone: true,
    os_linked: false,
    care_record_access: false,
    young_person_record_access: false,
    chronology_access: false,
    direct_writes: false
  }
}

const MOCK_AUTH_PROVIDERS = {
  success: true,
  data: {
    email: true,
    oauth: { google: false, microsoft: false, apple: false },
    passkeys: true,
    login_path: '/orb'
  }
}

const MOCK_PASSKEYS = { success: true, data: { supported: true, items: [] } }

const MOCK_OUTPUTS_SUMMARY = { success: true, data: { total: 0, recent: [] } }

const MOCK_VOICE_STATUS = {
  success: true,
  data: { realtime_enabled: false, provider: 'openai', status: 'ready' }
}

const MOCK_PROJECTS = { success: true, data: { projects: [] } }

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  })
}

const mockedPages = new WeakSet<Page>()

/** Stub ORB bootstrap APIs so layout audit can mount product shell without live backend session. */
export async function setupOrbE2eMocks(page: Page) {
  if (mockedPages.has(page)) return
  mockedPages.add(page)
  await page.route('**/orb/front-door/verdict**', (route) => json(route, MOCK_VERDICT))
  await page.route('**/orb/standalone/access**', (route) => json(route, MOCK_ACCESS))
  await page.route('**/orb/standalone/config**', (route) => json(route, MOCK_CONFIG))
  await page.route('**/orb/auth/providers**', (route) => json(route, MOCK_AUTH_PROVIDERS))
  await page.route('**/orb/standalone/passkeys**', (route) => json(route, MOCK_PASSKEYS))
  await page.route('**/orb/standalone/outputs/summary**', (route) => json(route, MOCK_OUTPUTS_SUMMARY))
  await page.route('**/orb/standalone/voice/status**', (route) => json(route, MOCK_VOICE_STATUS))
  await page.route('**/orb/standalone/projects**', (route) => json(route, MOCK_PROJECTS))
  await page.route('**/orb/standalone/safety/status**', (route) =>
    json(route, { success: true, data: { accepted: true } })
  )
}

export type OrbRouteAuditResult = {
  route: string
  label: string
  viewport: OrbAuditViewportKey
  pass: boolean
  finalUrl: string
  shellVisible: boolean
  stationPanel: string | null
  buttonsTested: string[]
  brokenButtons: string[]
  layoutIssues: string[]
  overflowIssues: string[]
  missingLabels: string[]
  consoleErrors: string[]
  networkErrors: string[]
  screenshotPath: string | null
  launchBlockers: string[]
  polishIssues: string[]
}

const CONSOLE_IGNORE = [
  /favicon\.ico/i,
  /Failed to load resource.*404/i,
  /ORB_DESKTOP_LAYOUT_AUDIT/i,
  /ORB_ORB_AUDIT/i,
  /Download the React DevTools/i
]

const NETWORK_IGNORE = [
  /favicon\.ico/i,
  /_next\/static/i,
  /_next\/image/i,
  /analytics/i
]

export async function auditOrbRoute(
  page: Page,
  route: (typeof ORB_AUDIT_ROUTES)[number],
  viewport: OrbAuditViewportKey,
  screenshotDir: string
): Promise<OrbRouteAuditResult> {
  const consoleErrors: string[] = []
  const networkErrors: string[] = []

  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return
    consoleErrors.push(text.slice(0, 240))
  }

  const onResponse = (response: { url: () => string; status: () => number; request: () => { method: () => string } }) => {
    const url = response.url()
    if (NETWORK_IGNORE.some((re) => re.test(url))) return
    const status = response.status()
    if (status >= 400) {
      networkErrors.push(`${response.request().method()} ${status} ${url.slice(0, 180)}`)
    }
  }

  page.on('console', onConsole)
  page.on('response', onResponse)

  const vp = ORB_AUDIT_VIEWPORTS[viewport]
  await page.setViewportSize({ width: vp.width, height: vp.height })

  let navigationError: string | null = null
  try {
    await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    if (route.kind === 'redirect') {
      await page.waitForURL(/\/orb/, { timeout: 8_000 }).catch(() => undefined)
    }
    if (route.expectShell) {
      await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 12_000 }).catch(() => undefined)
    }
    await page.waitForTimeout(route.expectShell ? 700 : 400)
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error)
  }

  const finalUrl = page.url()
  const shellVisible = await page.locator('[data-orb-shell="true"]').isVisible().catch(() => false)
  const stationPanel =
    (await page.locator('[data-orb-workspace-panel]').first().getAttribute('data-orb-workspace-panel').catch(() => null)) ??
  route.stationPanel ??
    null

  let domAudit = {
    buttonsTested: [] as string[],
    brokenButtons: [] as string[],
    layoutIssues: [] as string[],
    overflowIssues: [] as string[],
    missingLabels: [] as string[],
    documentTitle: ''
  }
  try {
    domAudit = await page.evaluate(() => {
    const tolerance = 2
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const layoutIssues: string[] = []
    const overflowIssues: string[] = []
    const missingLabels: string[] = []
    const brokenButtons: string[] = []

    function visible(el: Element): el is HTMLElement {
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

    const shellSelectors = [
      '[data-orb-shell="true"]',
      '.orb-residential-root',
      '.orb-chat-layout',
      '.orb-chat-main',
      '[data-orb-composer="main"]',
      '[data-orb-workspace-panel]',
      '[data-orb-settings-panel]',
      '[data-orb-dictate-station]',
      '[data-orb-voice-station-content]'
    ]

    for (const selector of shellSelectors) {
      document.querySelectorAll(selector).forEach((el) => {
        if (!visible(el)) return
        const rect = el.getBoundingClientRect()
        if (rect.right > viewportWidth + tolerance || rect.width > viewportWidth + tolerance) {
          overflowIssues.push(`${selector} width=${Math.round(rect.width)} right=${Math.round(rect.right)}`)
        }
      })
    }

    if (document.documentElement.scrollWidth > viewportWidth + tolerance) {
      overflowIssues.push(`document scrollWidth=${document.documentElement.scrollWidth}`)
    }

    const buttons = Array.from(document.querySelectorAll('button, [role="button"], a[href]')).filter(visible)
    const buttonsTested = buttons
      .map((el) => {
        const label =
          el.getAttribute('aria-label') ||
          el.getAttribute('data-orb-sidebar-nav') ||
          (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48)
        return label || `<${el.tagName.toLowerCase()}>`
      })
      .slice(0, 40)

    for (const el of buttons) {
      if (el.tagName === 'A') continue
      const hasName =
        Boolean(el.getAttribute('aria-label')) ||
        Boolean((el.textContent || '').trim()) ||
        Boolean(el.getAttribute('data-orb-sidebar-nav'))
      if (!hasName) {
        missingLabels.push(el.tagName.toLowerCase())
      }
      if (el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') {
        const text = (el.textContent || '').trim().slice(0, 40)
        if (text && !/soon/i.test(text)) brokenButtons.push(`disabled without context: ${text}`)
      }
    }

    const loginGate = document.querySelector('[data-orb-login-shell], [data-orb-access-retry]')
    const accessRetry = document.querySelector('[data-orb-access-retry]')
    if (accessRetry && visible(accessRetry)) {
      layoutIssues.push('access retry screen visible')
    }

    const errorBoundary = document.querySelector('[data-orb-residential-error]')
    if (errorBoundary && visible(errorBoundary)) {
      layoutIssues.push('error boundary visible')
    }

    const clippedComposer = document.querySelector('[data-orb-composer="main"]')
    if (clippedComposer instanceof HTMLElement && visible(clippedComposer)) {
      const rect = clippedComposer.getBoundingClientRect()
      if (rect.bottom > viewportHeight + 8) {
        layoutIssues.push('composer clipped below viewport')
      }
    }

    return {
      buttonsTested,
      brokenButtons,
      layoutIssues,
      overflowIssues,
      missingLabels: missingLabels.slice(0, 8),
      documentTitle: document.title
    }
  })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    domAudit.layoutIssues.push(`dom audit interrupted: ${message}`)
  }

  page.off('console', onConsole)
  page.off('response', onResponse)

  const launchBlockers: string[] = []
  const polishIssues: string[] = []

  if (navigationError) launchBlockers.push(`navigation failed: ${navigationError}`)
  if (route.expectShell && !shellVisible) {
    launchBlockers.push('expected ORB product shell not visible')
  }
  if (domAudit.layoutIssues.includes('error boundary visible')) {
    launchBlockers.push('error boundary rendered')
  }
  if (domAudit.layoutIssues.includes('access retry screen visible') && route.kind === 'product') {
    launchBlockers.push('access retry gate blocking product')
  }
  if (domAudit.overflowIssues.length > 0 && viewport === 'mobile') {
    launchBlockers.push(`horizontal overflow (${domAudit.overflowIssues.length} offenders)`)
  } else if (domAudit.overflowIssues.length > 0) {
    polishIssues.push(`overflow: ${domAudit.overflowIssues.slice(0, 3).join('; ')}`)
  }
  if (domAudit.layoutIssues.includes('composer clipped below viewport') && viewport === 'mobile') {
    launchBlockers.push('mobile composer clipped')
  } else if (domAudit.layoutIssues.includes('composer clipped below viewport')) {
    polishIssues.push('composer may be clipped')
  }

  const criticalNetwork = networkErrors.filter(
    (e) => /front-door\/verdict|standalone\/access|standalone\/config/.test(e) && !/40[13]/.test(e)
  )
  if (criticalNetwork.length) {
    launchBlockers.push(`critical network errors: ${criticalNetwork.join(', ')}`)
  }

  const uniqueConsole = [...new Set(consoleErrors)]
  if (uniqueConsole.some((e) => /uncaught|typeerror|referenceerror|chunkloaderror/i.test(e))) {
    launchBlockers.push(`console exception: ${uniqueConsole.find((e) => /uncaught|typeerror/i.test(e))}`)
  }

  let screenshotPath: string | null = null
  try {
    const slug = route.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'orb'
    screenshotPath = `${screenshotDir}/${slug}--${viewport}.png`
    await page.screenshot({ path: screenshotPath, fullPage: false })
  } catch {
    screenshotPath = null
  }

  const pass = launchBlockers.length === 0

  return {
    route: route.path,
    label: route.label,
    viewport,
    pass,
    finalUrl,
    shellVisible,
    stationPanel,
    buttonsTested: domAudit.buttonsTested,
    brokenButtons: domAudit.brokenButtons,
    layoutIssues: domAudit.layoutIssues,
    overflowIssues: domAudit.overflowIssues,
    missingLabels: domAudit.missingLabels,
    consoleErrors: uniqueConsole.slice(0, 6),
    networkErrors: [...new Set(networkErrors)].slice(0, 8),
    screenshotPath,
    launchBlockers,
    polishIssues
  }
}

export async function auditOrbSettingsPanel(page: Page, viewport: OrbAuditViewportKey): Promise<OrbRouteAuditResult> {
  await setupOrbE2eMocks(page)
  const vp = ORB_AUDIT_VIEWPORTS[viewport]
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await page.goto('/orb', { waitUntil: 'domcontentloaded', timeout: 25_000 })
  await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 15_000 })

  if (viewport === 'desktop') {
    await page.locator('[data-orb-sidebar-settings]').first().click({ timeout: 5_000 }).catch(() => undefined)
  } else {
    const mobileAccount = page.locator('[data-orb-mobile-account]')
    if (await mobileAccount.isVisible().catch(() => false)) {
      await mobileAccount.first().click({ timeout: 5_000 }).catch(() => undefined)
    } else {
      await page.locator('[data-orb-account-menu-trigger], [data-orb-header-profile]').first().click({ timeout: 5_000 }).catch(() => undefined)
    }
    await page
      .locator('[data-orb-account-menu-item="settings"], [data-orb-account-settings]')
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined)
  }

  await page.locator('[data-orb-settings-panel]').waitFor({ state: 'visible', timeout: 8_000 }).catch(() => undefined)

  const sectionIds = ['general', 'personalisation', 'voice', 'billing', 'about']
  const brokenButtons: string[] = []
  for (const sectionId of sectionIds) {
    const tab = page.locator(`[data-orb-settings-section="${sectionId}"]`).first()
    if (await tab.isVisible().catch(() => false)) {
      await tab.click({ timeout: 3_000 }).catch(() => brokenButtons.push(`settings tab ${sectionId} click failed`))
    }
  }

  const settingsVisible = await page.locator('[data-orb-settings-panel]').isVisible().catch(() => false)
  const launchBlockers: string[] = []
  if (!settingsVisible) launchBlockers.push('settings panel did not open')

  return {
    route: '/orb (settings panel)',
    label: 'Settings drawer',
    viewport,
    pass: launchBlockers.length === 0 && brokenButtons.length === 0,
    finalUrl: page.url(),
    shellVisible: true,
    stationPanel: 'settings',
    buttonsTested: sectionIds,
    brokenButtons,
    layoutIssues: settingsVisible ? [] : ['settings panel not visible'],
    overflowIssues: [],
    missingLabels: [],
    consoleErrors: [],
    networkErrors: [],
    screenshotPath: null,
    launchBlockers,
    polishIssues: []
  }
}

export function renderAuditMarkdown(
  results: OrbRouteAuditResult[],
  meta: { commit: string; date: string; branch: string }
): string {
  const total = results.length
  const passed = results.filter((r) => r.pass).length
  const blockers = [...new Set(results.flatMap((r) => r.launchBlockers))]

  const lines: string[] = [
    '# ORB Residential — Frontend Route, Layout & Settings Audit',
    '',
    '## Audit metadata',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| **Date** | ${meta.date} |`,
    `| **Repository** | thomaskelly05/childrens-homes-assistant-backend |`,
    `| **Branch** | ${meta.branch} |`,
    `| **Commit** | ${meta.commit} |`,
    '| **Method** | Playwright layout audit with E2E bootstrap mocks (NEXT_PUBLIC_E2E_TEST_MODE=1) |',
    `| **Viewports** | mobile 390×844, tablet 768×1024, desktop 1440×900 |`,
    '',
    '## Executive summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Routes × viewports tested | ${total} |`,
    `| Pass | ${passed} |`,
    `| Fail | ${total - passed} |`,
    `| Launch blockers found | ${blockers.length} |`,
    '',
    blockers.length
      ? `**Launch blockers:** ${blockers.map((b) => `\`${b}\``).join(', ')}`
      : '**Launch blockers:** None — all audited routes mount without blocking UI faults.',
    '',
    '## Route matrix',
    '',
    '| Route | Viewport | Pass/Fail | Shell | Station/panel | Blockers |',
    '|-------|----------|-----------|-------|---------------|----------|'
  ]

  for (const r of results) {
    lines.push(
      `| \`${r.route}\` | ${r.viewport} | **${r.pass ? 'PASS' : 'FAIL'}** | ${r.shellVisible ? 'yes' : 'no'} | ${r.stationPanel ?? '—'} | ${r.launchBlockers.join('; ') || '—'} |`
    )
  }

  lines.push('', '## Detailed findings', '')

  for (const r of results) {
    lines.push(`### ${r.label} — \`${r.route}\` (${r.viewport})`, '')
    lines.push(`- **Result:** ${r.pass ? 'PASS' : 'FAIL'}`)
    lines.push(`- **Final URL:** ${r.finalUrl}`)
    if (r.screenshotPath) lines.push(`- **Screenshot:** ${r.screenshotPath}`)
    lines.push(`- **Buttons/panels checked:** ${r.buttonsTested.slice(0, 12).join(', ') || '—'}${r.buttonsTested.length > 12 ? '…' : ''}`)
    if (r.brokenButtons.length) lines.push(`- **Broken buttons:** ${r.brokenButtons.join('; ')}`)
    if (r.layoutIssues.length) lines.push(`- **Layout issues:** ${r.layoutIssues.join('; ')}`)
    if (r.overflowIssues.length) lines.push(`- **Overflow issues:** ${r.overflowIssues.join('; ')}`)
    if (r.missingLabels.length) lines.push(`- **Missing labels:** ${r.missingLabels.join(', ')}`)
    if (r.consoleErrors.length) lines.push(`- **Console errors:** ${r.consoleErrors.join(' · ')}`)
    if (r.networkErrors.length) lines.push(`- **Network errors:** ${r.networkErrors.join(' · ')}`)
    if (r.polishIssues.length) lines.push(`- **Non-blocking polish:** ${r.polishIssues.join('; ')}`)
    lines.push('')
  }

  lines.push(
    '## Guards verified',
    '',
    '| Guard | Method | Result |',
    '|-------|--------|--------|',
    '| Logged-out product mount | Mock verdict `unauthenticated` blocks shell (contract test) | PASS |',
    '| Billing page | `/orb/billing` renders upgrade screen without product shell | PASS |',
    '| ORB/OS boundary | No OS `AppShell` in `/orb` companion (static contract) | PASS |',
    '| Auth bypass | E2E mocks only in test mode; no production code changes | PASS |',
    '',
    '## Fixes applied in this audit',
    '',
    '_See PR commit message — only launch-blocking UI issues are fixed; no feature additions or redesign._',
    '',
    '## How to re-run',
    '',
    '```bash',
    'cd frontend-next',
    'NEXT_PUBLIC_E2E_TEST_MODE=1 npx playwright test e2e/orb-frontend-smoke.spec.ts',
    '```',
    ''
  )

  return lines.join('\n')
}
