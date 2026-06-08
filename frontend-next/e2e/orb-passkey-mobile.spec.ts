/**
 * ORB passkey + mobile login scroll E2E.
 * Requires NEXT_PUBLIC_E2E_TEST_MODE=1 (see playwright.config.ts webServer).
 */
import { test, expect } from '@playwright/test'

import {
  ORB_LOGIN_VIEWPORTS,
  assertLoginMobileScroll,
  assertNoHorizontalOverflow,
  assertElementReachable,
  disableE2eAutoAuth,
  gotoOrbLogin,
  mockWebAuthn,
  setupOrbAuthE2eMocks,
  setupOrbE2eMocks,
  E2E_CREDENTIALS
} from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB login mobile scroll and passkey', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB passkey/mobile E2E')
  test.describe.configure({ timeout: 90_000 })

  for (const viewport of ORB_LOGIN_VIEWPORTS) {
    test(`login scroll reachability at ${viewport.label}`, async ({ page }) => {
      await mockWebAuthn(page, 'success')
      await disableE2eAutoAuth(page)
      await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await gotoOrbLogin(page)
      await assertLoginMobileScroll(page)
    })
  }

  test('/orb/login redirects to canonical front door with login gate', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await mockWebAuthn(page, 'success')
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb/login', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await expect(page).toHaveURL(/\/orb/)
    await expect(page.locator('[data-orb-login-page]')).toBeVisible({ timeout: 20_000 })
  })

  test('passkey toggle reveals button on compact viewport', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 667 })
    await gotoOrbLogin(page)

    const toggle = page.locator('[data-orb-passkey-toggle]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await assertElementReachable(page, '[data-orb-passkey-sign-in]')
  })

  test('unsupported device shows passkey unavailable message', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await mockWebAuthn(page, 'unsupported')
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated', passkeysSupported: false })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrbLogin(page)
    await expect(page.locator('[data-orb-passkey-unavailable]')).toBeVisible()
    await expect(page.locator('[data-orb-passkey-unavailable]')).toContainText(/not available/i)
  })

  test('passkey requires email before attempt', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrbLogin(page)

    const toggle = page.locator('[data-orb-passkey-toggle]')
    if (await toggle.isVisible()) {
      const expanded = await toggle.getAttribute('aria-expanded')
      if (expanded === 'false') await toggle.click()
    }

    await page.locator('[data-orb-passkey-email]').fill('')
    await page.locator('[data-orb-passkey-sign-in]').click()
    await expect(page.locator('.orb-login-error').first()).toContainText(/email/i)
  })

  test('cancelled passkey shows friendly message', async ({ page }) => {
    await mockWebAuthn(page, 'cancel')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrbLogin(page)

    const toggle = page.locator('[data-orb-passkey-toggle]')
    if (await toggle.isVisible()) {
      const expanded = await toggle.getAttribute('aria-expanded')
      if (expanded === 'false') await toggle.click()
    }

    await page.locator('[data-orb-passkey-email]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-orb-passkey-sign-in]').click()
    await expect(page.locator('.orb-login-error').first()).toContainText(/cancelled|timed out/i)
  })

  test('mocked passkey sign-in reaches ORB product', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await setupOrbE2eMocks(page)

    let authed = false
    await page.route('**/orb/front-door/verdict**', async (route) => {
      const body = authed
        ? {
            success: true,
            data: {
              contract_version: 'orb_front_door_v1',
              verdict: 'ready',
              authenticated: true,
              can_use_orb: true,
              access_blocker: null,
              safety_accepted: true,
              subscription: { active: true, status: 'active', plan_name: 'ORB Residential' },
              user: { id: 9001, email: E2E_CREDENTIALS.email, role: 'manager' },
              frontend_should_mount_product: true,
              allowed_bootstrap: true,
              backend_build: 'e2e-auth',
              reason: 'e2e_mock_ready',
              access: {
                contract_version: 'orb_access_v2',
                product: 'orb_residential',
                price_label: '£9.99/month',
                can_use_orb: true,
                access_state: 'active',
                trial: { available: true, active: true, days_left: 14, expires_at: null },
                subscription: { active: true, status: 'active', plan_name: 'ORB Residential' },
                billing: { stripe_configured: true, price_gbp_monthly: 9.99 },
                standalone: true,
                os_records_accessed: false,
                os_access_granted: false,
                safety_accepted: true,
                onboarding_completed: true,
                upgrade: { checkout_available: true, trial_available: true, manage_billing_available: false }
              }
            }
          }
        : {
            success: true,
            data: {
              contract_version: 'orb_front_door_v1',
              verdict: 'unauthenticated',
              authenticated: false,
              can_use_orb: false,
              access_blocker: null,
              safety_accepted: false,
              subscription: null,
              user: null,
              frontend_should_mount_product: false,
              allowed_bootstrap: false,
              backend_build: 'e2e-auth',
              reason: 'e2e_mock_unauth',
              clear_session: true,
              access: null
            }
          }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrbLogin(page)

    const toggle = page.locator('[data-orb-passkey-toggle]')
    if (await toggle.isVisible()) {
      const expanded = await toggle.getAttribute('aria-expanded')
      if (expanded === 'false') await toggle.click()
    }

    authed = true
    await page.locator('[data-orb-passkey-email]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-orb-passkey-sign-in]').click()
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 25_000 })
  })

  test('no horizontal overflow on login at 390px', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoOrbLogin(page)
    await assertNoHorizontalOverflow(page)
  })
})
