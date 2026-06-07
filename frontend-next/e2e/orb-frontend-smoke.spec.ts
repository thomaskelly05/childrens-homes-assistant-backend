/**
 * ORB Residential frontend smoke tests (fast CI subset).
 * Full route matrix: npm run e2e:orb-route-audit
 */
import { test, expect } from '@playwright/test'

import {
  auditOrbRoute,
  auditOrbSettingsPanel,
  setupOrbE2eMocks
} from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'
const screenshotDir = 'e2e/artifacts/orb-route-audit'

test.describe('ORB Residential frontend smoke', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB frontend smoke')
  test.describe.configure({ timeout: 90_000 })

  test('mobile chat home has no horizontal overflow', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 20_000 })
    const audit = await page.evaluate(() => {
      const tolerance = 1
      const viewportWidth = window.innerWidth
      const offenders: string[] = []
      const selectors = ['[data-orb-shell="true"]', '.orb-chat-layout', '[data-orb-composer="main"]']
      for (const selector of selectors) {
        const el = document.querySelector(selector)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.right > viewportWidth + tolerance) offenders.push(selector)
      }
      return {
        ok: offenders.length === 0 && document.documentElement.scrollWidth <= viewportWidth + tolerance,
        offenders,
        scrollWidth: document.documentElement.scrollWidth
      }
    })
    expect(audit.ok, JSON.stringify(audit)).toBe(true)
  })

  test('legacy /orb/outputs deep-links to saved station', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const result = await auditOrbRoute(
      page,
      { path: '/orb/outputs', label: 'Outputs legacy', kind: 'redirect', expectShell: true, stationPanel: 'saved' },
      'mobile',
      screenshotDir
    )
    expect(result.launchBlockers).toEqual([])
    expect(result.finalUrl).toContain('station=saved')
  })

  test('settings panel opens on mobile and desktop', async ({ page }) => {
    await setupOrbE2eMocks(page)
    for (const viewport of ['mobile', 'desktop'] as const) {
      const size = viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }
      await page.setViewportSize(size)
      const result = await auditOrbSettingsPanel(page, viewport)
      expect(result.launchBlockers, `${viewport} settings`).toEqual([])
    }
  })
})
