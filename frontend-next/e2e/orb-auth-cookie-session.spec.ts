/**
 * ORB cookie / session / logout E2E — stale session, failed login, sign-out.
 */
import { test, expect } from '@playwright/test'

import {
  disableE2eAutoAuth,
  E2E_CREDENTIALS,
  gotoOrbLogin,
  mockWebAuthn,
  setupOrbAuthE2eMocks,
  setupOrbE2eMocks
} from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB cookie and session E2E', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB cookie/session E2E')
  test.describe.configure({ timeout: 90_000 })

  test('logged out visit to /orb shows login gate', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.context().clearCookies()
    await gotoOrbLogin(page)
    await expect(page.locator('[data-orb-login-page]')).toBeVisible()
    await expect(page.locator('[data-orb-shell="true"]')).not.toBeVisible()
  })

  test('stale cookie does not trap user — login remains available', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'stale-cookie' })
    await page.context().addCookies([
      {
        name: 'indicare_session',
        value: 'stale-invalid-session-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ])
    await gotoOrbLogin(page)
    await expect(page.locator('[data-orb-login-page]')).toBeVisible()
    await expect(page.locator('[data-testid="orb-login-email"]')).toBeEnabled()
  })

  test('stale cookie then successful login reaches ORB', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'stale-cookie' })
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
              reason: 'e2e_stale',
              clear_session: true,
              access: null
            }
          }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    await page.context().addCookies([
      {
        name: 'indicare_session',
        value: 'stale-invalid-session-token',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ])
    await gotoOrbLogin(page)

    await page.locator('[data-testid="orb-login-email"]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-testid="orb-login-password"]').fill(E2E_CREDENTIALS.password)

    await page.route('**/auth/me**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 9001,
            email: E2E_CREDENTIALS.email,
            role: 'manager',
            home_id: 1,
            provider_id: 1,
            first_name: 'E2E',
            last_name: 'Manager',
            is_active: true,
            permissions: [],
            subscription_active: true,
            subscription_status: 'active',
            plan_name: 'ORB Residential',
            mfa_enabled: false,
            mfa_verified: false,
            has_passkeys: false
          }
        })
      })
    )

    authed = true
    await page.locator('[data-testid="orb-login-submit"]').click()
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 25_000 })
  })

  test('failed login shows error without partial auth state', async ({ page }) => {
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

    await gotoOrbLogin(page)

    await page.locator('[data-testid="orb-login-email"]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-testid="orb-login-password"]').fill('WrongPassword123!')
    await page.locator('[data-testid="orb-login-submit"]').click()

    await expect(page.locator('.orb-login-error').first()).toContainText(/invalid|could not|password|authentication request failed/i)
    await expect(page.locator('[data-orb-shell="true"]')).not.toBeVisible()

    authed = true
    await page.locator('[data-testid="orb-login-password"]').fill(E2E_CREDENTIALS.password)
    await page.locator('[data-testid="orb-login-submit"]').click()
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 25_000 })
  })

  test('logout clears session and revisiting /orb shows login', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'ready' })
    await setupOrbE2eMocks(page)

    let authed = true
    await page.route('**/auth/me**', (route) => {
      if (!authed) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Not authenticated' }) })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 9001,
            email: E2E_CREDENTIALS.email,
            role: 'manager',
            home_id: 1,
            provider_id: 1,
            first_name: 'E2E',
            last_name: 'Manager',
            is_active: true,
            permissions: [],
            subscription_active: true,
            subscription_status: 'active',
            plan_name: 'ORB Residential',
            mfa_enabled: false,
            mfa_verified: false,
            has_passkeys: false
          }
        })
      })
    })

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
                billing: { stripe_configured: false, price_gbp_monthly: 9.99 },
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
              reason: 'e2e_logged_out',
              clear_session: true,
              access: null
            }
          }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb')
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 20_000 })

    const accountTrigger = page
      .locator('[data-orb-mobile-account], [data-orb-account-menu-trigger], [data-orb-header-profile]')
      .first()
    await accountTrigger.click({ timeout: 8_000 })

    authed = false
    await page.locator('[data-testid="sign-out"], [data-orb-account-menu-signout]').first().click({ timeout: 8_000 })
    await page.goto('/orb', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined)
    await expect(page.getByRole('heading', { name: 'Sign in to ORB Residential' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[data-testid="orb-login-email"]')).toBeVisible()
    await expect(page.locator('[data-orb-shell="true"]')).toHaveCount(0)
  })
})
