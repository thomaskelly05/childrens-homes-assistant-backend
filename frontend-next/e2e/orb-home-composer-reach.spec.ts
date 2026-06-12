/**
 * Home composer must stay reachable at short mobile height without page scroll.
 */
import { test, expect } from '@playwright/test'

import { setupOrbE2eMocks } from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB home composer reach', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1')

  test.use({ viewport: { width: 390, height: 740 } })

  test('composer and send stay within viewport', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const composer = document.querySelector('[data-orb-composer="main"]')
      const rect = composer?.getBoundingClientRect()
      const send = document.querySelector('[data-orb-composer-send], .orb-composer-send')
      const sendRect = send?.getBoundingClientRect()
      return {
        composerBottom: rect?.bottom ?? 0,
        sendBottom: sendRect?.bottom ?? 0,
        vh,
        pageScroll: document.documentElement.scrollHeight > vh + 4
      }
    })

    expect(audit.pageScroll, JSON.stringify(audit)).toBe(false)
    expect(audit.composerBottom).toBeLessThanOrEqual(audit.vh + 4)
    expect(audit.sendBottom).toBeLessThanOrEqual(audit.vh + 4)
  })
})
