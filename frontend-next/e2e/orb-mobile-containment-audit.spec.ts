/**
 * ORB mobile viewport containment audit — page must not scroll; composer must stay reachable.
 * Requires NEXT_PUBLIC_E2E_TEST_MODE=1 (see playwright.config.ts webServer).
 */
import { test, expect } from '@playwright/test'

import { setupOrbE2eMocks } from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

const routes = [
  { path: '/orb', label: 'home' },
  { path: '/orb?station=orb_dictate', label: 'dictate' },
  { path: '/orb?station=orb_voice', label: 'voice' },
  { path: '/orb?station=orb_write', label: 'write' }
] as const

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 390, height: 740, label: '390x740' },
  { width: 1280, height: 800, label: '1280x800' }
] as const

test.describe('ORB mobile viewport containment', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB containment audit')

  for (const vp of viewports) {
    test.describe(vp.label, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      for (const route of routes) {
        test(`${route.label} — no page scroll, composer reachable`, async ({ page }) => {
          await setupOrbE2eMocks(page)
          await page.goto(route.path)
          await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })
          await page.waitForTimeout(700)

          const audit = await page.evaluate(() => {
            const vh = window.innerHeight
            const vw = window.innerWidth
            const bodyScroll = document.body.scrollHeight > vh + 4
            const htmlScroll = document.documentElement.scrollHeight > vh + 4
            const docScrollW = document.documentElement.scrollWidth > vw + 2

            const shell = document.querySelector('[data-orb-shell="true"]')
            const shellRect = shell?.getBoundingClientRect()
            const composer = document.querySelector('[data-orb-composer="main"]')
            const composerRect = composer?.getBoundingClientRect()

            const issues: string[] = []
            if (bodyScroll) issues.push(`body scrollHeight=${document.body.scrollHeight}`)
            if (htmlScroll) issues.push(`html scrollHeight=${document.documentElement.scrollHeight}`)
            if (docScrollW) issues.push(`doc scrollWidth=${document.documentElement.scrollWidth}`)
            if (shellRect && shellRect.bottom > vh + 4) {
              issues.push(`shell bottom=${Math.round(shellRect.bottom)}`)
            }
            if (composerRect && composerRect.bottom > vh + 4) {
              issues.push(`composer bottom=${Math.round(composerRect.bottom)}`)
            }
            if (composerRect && composerRect.top > vh) issues.push('composer below viewport')

            return { vh, vw, issues, hasComposer: Boolean(composerRect?.height) }
          })

          // Write/dictate/voice hide chat composer — only assert on home
          if (route.label === 'home') {
            expect(audit.hasComposer, JSON.stringify(audit)).toBe(true)
          }
          expect(audit.issues, JSON.stringify(audit)).toEqual([])
        })
      }
    })
  }
})
