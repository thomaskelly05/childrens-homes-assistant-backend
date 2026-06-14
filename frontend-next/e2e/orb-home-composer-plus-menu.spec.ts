/**
 * Mobile composer + attachment menu — real tap coordinates on /orb home.
 */
import { test, expect } from '@playwright/test'

import { setupOrbE2eMocks } from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB home composer plus menu', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1')

  test.use({ viewport: { width: 390, height: 844 } })

  test('tapping plus opens Camera Photos Files without focusing input', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    const plus = page.locator('[data-orb-composer-plus-button]').first()
    await expect(plus).toBeVisible()
    await plus.click()

    const menu = page.locator('[data-orb-composer-attachment-menu]')
    await expect(menu).toBeVisible()
    await expect(menu.locator('[data-orb-composer-upload-action="take_photo"]')).toBeVisible()
    await expect(menu.locator('[data-orb-composer-upload-action="photo_library"]')).toBeVisible()
    await expect(menu.locator('[data-orb-composer-upload-action="choose_files"]')).toBeVisible()

    const focused = await page.evaluate(() => {
      const active = document.activeElement
      const input = document.querySelector('[data-orb-composer-input]')
      return active === input
    })
    expect(focused).toBe(false)

    await expect(menu).toBeVisible()
  })

  test('mobile home has one composer and one plus button', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })

    await expect(page.locator('[data-orb-standalone-composer]')).toHaveCount(1)
    await expect(page.locator('[data-orb-composer-plus-button]')).toHaveCount(1)
    await expect(page.locator('[data-orb-composer-plus-menu]')).toHaveCount(0)
  })
})
