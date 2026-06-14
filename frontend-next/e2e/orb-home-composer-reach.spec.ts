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

  test('focused composer keeps send reachable with long input and no page scroll', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    const input = page.locator('[data-orb-composer-input], .orb-composer-glass textarea').first()
    await input.click()
    await input.fill(`${'Long reflective note line.\n'.repeat(24)}`.trim())

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const composer = document.querySelector('[data-orb-composer="main"]')
      const composerRect = composer?.getBoundingClientRect()
      const send = document.querySelector('[data-orb-composer-send], .orb-composer-send')
      const sendRect = send?.getBoundingClientRect()
      const textarea = document.querySelector(
        '[data-orb-composer-input], .orb-composer-glass textarea'
      ) as HTMLTextAreaElement | null
      const textareaStyle = textarea ? window.getComputedStyle(textarea) : null
      const textareaScrollable =
        textarea != null && textarea.scrollHeight > textarea.clientHeight + 2
      return {
        vh,
        pageScroll: document.documentElement.scrollHeight > vh + 4,
        composerBottom: composerRect?.bottom ?? 0,
        sendBottom: sendRect?.bottom ?? 0,
        textareaMaxHeight: textareaStyle?.maxHeight ?? null,
        textareaScrollable
      }
    })

    expect(audit.pageScroll, JSON.stringify(audit)).toBe(false)
    expect(audit.sendBottom).toBeLessThanOrEqual(audit.vh + 4)
    expect(audit.textareaScrollable, JSON.stringify(audit)).toBe(true)
  })

  test('privacy guidance is available from settings not composer shield', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    await expect(page.locator('[data-orb-privacy-guidance-link]')).toHaveCount(0)
    await expect(page.locator('[data-orb-privacy-notice="chat"]')).toHaveCount(0)
    await expect(page.locator('[data-orb-privacy-guidance-trigger]')).toHaveCount(0)

    await page.locator('[data-orb-composer-tools-trigger], [data-orb-composer-attach]').click()
    await page.locator('[data-orb-composer-tools-item="privacy_guidance"]').click()
    await expect(page.locator('[data-orb-privacy-guidance-sheet]')).toBeVisible()
    await expect(page.locator('[data-orb-privacy-guidance-list] li')).toHaveCount(4)
    await page.locator('[data-orb-privacy-guidance-done]').click()
    await expect(page.locator('[data-orb-privacy-guidance-sheet]')).toHaveCount(0)
    await expect(page.locator('[data-orb-composer-tools-trigger], [data-orb-composer-attach]')).toBeVisible()
  })

  test('more examples opens grouped starter bottom sheet', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    await page.locator('[data-orb-more-examples]').click()
    await expect(page.locator('[data-orb-more-examples-sheet]')).toBeVisible()
    await expect(page.locator('[data-orb-starter-group]')).toHaveCount(3)
  })
})
