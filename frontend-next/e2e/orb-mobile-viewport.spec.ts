/**
 * ORB /orb mobile viewport — no horizontal overflow at iPhone width.
 * Requires NEXT_PUBLIC_E2E_TEST_MODE=1 (see playwright.config.ts webServer).
 */
import { test, expect } from '@playwright/test'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB mobile viewport', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB mobile viewport E2E')

  test.use({ viewport: { width: 390, height: 844 } })

  test('visible shell elements fit within 390px width', async ({ page }) => {
    await page.goto('/orb')
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 20_000 })

    const audit = await page.evaluate(() => {
      const tolerance = 1
      const viewportWidth = window.innerWidth
      const selectors = [
        '[data-orb-shell="true"]',
        '.orb-residential-root',
        '.orb-chat-layout',
        '.orb-chat-shell',
        '.orb-chat-main',
        '.orb-mobile-chat-header',
        '[data-orb-composer="main"]',
        '.orb-composer-dock',
        '.orb-composer-glass',
        '[data-orb-starter-cards]',
        '[data-orb-starter-card]'
      ]
      const offenders: Array<{ selector: string; right: number; width: number }> = []

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

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((el) => {
          if (!visible(el)) return
          const rect = el.getBoundingClientRect()
          if (rect.right > viewportWidth + tolerance || rect.width > viewportWidth + tolerance) {
            offenders.push({
              selector,
              right: rect.right,
              width: rect.width
            })
          }
        })
      }

      return {
        viewportWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        offenders,
        ok: offenders.length === 0 && document.documentElement.scrollWidth <= viewportWidth + tolerance
      }
    })

    expect(audit.ok, JSON.stringify(audit, null, 2)).toBe(true)
    expect(audit.documentScrollWidth).toBeLessThanOrEqual(391)
  })
})
