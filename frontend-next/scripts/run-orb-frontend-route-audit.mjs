#!/usr/bin/env node
/**
 * ORB Residential route/layout audit — writes docs/orb-frontend-route-layout-audit.md
 * Usage: NEXT_PUBLIC_E2E_TEST_MODE=1 node scripts/run-orb-frontend-route-audit.mjs
 */
import { execSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(frontendRoot, '..')
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001'
const screenshotDir = join(frontendRoot, 'e2e', 'artifacts', 'orb-route-audit')

mkdirSync(screenshotDir, { recursive: true })

const helpersUrl = pathToFileURL(join(frontendRoot, 'e2e', 'orb-audit-helpers.ts')).href
const {
  ORB_AUDIT_ROUTES,
  auditOrbRoute,
  auditOrbSettingsPanel,
  renderAuditMarkdown,
  setupOrbE2eMocks
} = await import(helpersUrl)

function git(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function probe() {
  const res = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '5', `${baseURL}/orb`], {
    encoding: 'utf8'
  })
  return res.stdout?.trim() === '200'
}

if (!probe()) {
  console.error(`[orb-route-audit] Dev server not reachable at ${baseURL}`)
  process.exit(2)
}

const browser = await chromium.launch()
const context = await browser.newContext({ baseURL })
const page = await context.newPage()
const results = []

for (const viewport of ['mobile', 'tablet', 'desktop']) {
  for (const route of ORB_AUDIT_ROUTES) {
    await setupOrbE2eMocks(page)
    try {
      const result = await auditOrbRoute(page, route, viewport, screenshotDir)
      results.push(result)
      console.log(`[${result.pass ? 'PASS' : 'FAIL'}] ${viewport} ${route.path}`)
      if (!result.pass) console.log('  ', result.launchBlockers.join('; '))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`[FAIL] ${viewport} ${route.path} (threw: ${message})`)
      results.push({
        route: route.path,
        label: route.label,
        viewport,
        pass: false,
        finalUrl: page.url(),
        shellVisible: false,
        stationPanel: null,
        buttonsTested: [],
        brokenButtons: [],
        layoutIssues: [message],
        overflowIssues: [],
        missingLabels: [],
        consoleErrors: [],
        networkErrors: [],
        screenshotPath: null,
        launchBlockers: [`audit threw: ${message}`],
        polishIssues: []
      })
    }
  }
  await setupOrbE2eMocks(page)
  const settings = await auditOrbSettingsPanel(page, viewport)
  results.push(settings)
  console.log(`[${settings.pass ? 'PASS' : 'FAIL'}] ${viewport} settings panel`)
}

await browser.close()

const doc = renderAuditMarkdown(results, {
  commit: git('git rev-parse --short HEAD'),
  branch: git('git rev-parse --abbrev-ref HEAD'),
  date: new Date().toISOString().slice(0, 10)
})

const docPath = join(repoRoot, 'docs', 'orb-frontend-route-layout-audit.md')
writeFileSync(docPath, doc, 'utf8')
console.log(`[orb-route-audit] Wrote ${docPath}`)

process.exit(results.some((r) => !r.pass) ? 1 : 0)
