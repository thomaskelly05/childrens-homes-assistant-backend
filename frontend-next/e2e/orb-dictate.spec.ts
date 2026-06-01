/**
 * ORB Dictate E2E — requires NEXT_PUBLIC_E2E_TEST_MODE=1 and mocked backend.
 * Follow-up: wire Playwright webServer with test auth cookie when CI auth is available.
 */
import { test, expect } from '@playwright/test'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB Dictate studio', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB Dictate E2E')

  test('opens dictate station from /orb with local state', async ({ page }) => {
    await page.goto('/orb?station=orb_dictate')
    await expect(page.locator('[data-orb-dictate-station]')).toBeVisible({ timeout: 15_000 })
  })
})
