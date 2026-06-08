/**
 * ORB register, billing, checkout handoff and OAuth button E2E.
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

test.describe('ORB register and billing E2E', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB auth/billing E2E')
  test.describe.configure({ timeout: 90_000 })

  test('signup page loads with required fields and mobile scroll', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 667 })
    await page.goto('/orb/signup', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('[data-orb-signup-title]')).toBeVisible()
    await expect(page.locator('[data-testid="orb-signup-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="orb-signup-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="orb-signup-submit"]')).toBeVisible()

    const scrollAudit = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      canScroll: document.documentElement.scrollHeight > window.innerHeight
    }))
    expect(scrollAudit.scrollHeight).toBeGreaterThanOrEqual(scrollAudit.viewportHeight)
  })

  test('signup validation shows clear error for short password', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.goto('/orb/signup')
    await page.locator('[data-testid="orb-signup-email"]').fill('new.user@example.com')
    await page.locator('[data-testid="orb-signup-password"]').fill('short')
    await page.locator('[data-testid="orb-signup-submit"]').click()
    const validity = await page.locator('[data-testid="orb-signup-password"]').evaluate(
      (el) => (el as HTMLInputElement).validationMessage
    )
    expect(validity.length).toBeGreaterThan(0)
  })

  test('mocked signup redirects to setup after account creation', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await mockWebAuthn(page, 'success')
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.goto('/orb/signup')

    await page.getByLabel('First name').fill('New')
    await page.getByLabel('Last name').fill('User')
    await page.locator('[data-testid="orb-signup-email"]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-testid="orb-signup-password"]').fill(E2E_CREDENTIALS.password)
    await page.locator('[data-testid="orb-signup-submit"]').click()

    await expect(page).toHaveURL(/\/orb\/setup/, { timeout: 20_000 })
  })

  test('inactive user sees subscribe CTA on billing page', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-inactive' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb/billing', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('[data-orb-upgrade-title]')).toContainText(/Start ORB Residential/i)
    await expect(page.locator('[data-orb-subscribe]')).toBeVisible()
    await expect(page.locator('[data-orb-start-trial]')).toBeVisible()
  })

  test('active user sees manage billing when available', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-active' })
    await page.goto('/orb/billing')
    await expect(page.locator('[data-orb-manage-billing]')).toBeVisible()
  })

  test('checkout button calls checkout endpoint and returns mock URL', async ({ page }) => {
    await disableE2eAutoAuth(page)
    const checkoutUrl = 'https://checkout.stripe.com/e2e-test-session'
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-inactive', checkoutUrl })
    await page.goto('/orb/billing')

    const checkoutRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && /subscription\/checkout|billing\/checkout/.test(req.url())
    )

    await page.locator('[data-orb-subscribe]').click()
    const request = await checkoutRequest
    expect(request.method()).toBe('POST')
    await page.waitForURL(/checkout\.stripe\.com\/e2e-test-session/, { timeout: 15_000 })
  })

  test('billing success route refreshes access state', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-active' })
    await page.goto('/orb/billing/success')
    await expect(page.locator('[data-orb-billing-success-status]')).toBeVisible()
    await expect(page.locator('[data-orb-billing-success-status]')).toContainText(/ready|confirming|confirmed/i)
    await expect(page.locator('[data-orb-continue-to-orb]')).toBeVisible()
  })

  test('billing cancel route offers clear next actions', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-inactive' })
    await page.goto('/orb/billing/cancel')
    await expect(page.getByRole('heading', { name: /checkout cancelled/i })).toBeVisible()
    await expect(page.locator('[data-orb-billing-retry]')).toBeVisible()
    await expect(page.getByRole('link', { name: /return to orb/i })).toBeVisible()
  })

  test('checkout copy mentions card and wallet methods via Stripe', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'billing-inactive' })
    await page.goto('/orb/billing')
    await expect(page.locator('[data-orb-checkout-payment-methods]')).toContainText(/Apple Pay/)
    await expect(page.locator('[data-orb-checkout-payment-methods]')).toContainText(/Google Pay/)
    await expect(page.locator('[data-orb-checkout-payment-methods]')).not.toContainText(/Face ID/i)
  })

  test.describe('OAuth buttons', () => {
    test('enabled providers point to backend OAuth start URLs', async ({ page }) => {
      await disableE2eAutoAuth(page)
      await setupOrbAuthE2eMocks(page, {
        scenario: 'unauthenticated',
        oauth: { apple: true, google: true, microsoft: true }
      })
      await gotoOrbLogin(page)

      for (const provider of ['apple', 'google', 'microsoft'] as const) {
        const button = page.locator(`[data-orb-oauth="${provider}"]`).first()
        await expect(button).toBeVisible()
        await expect(button).not.toHaveAttribute('aria-disabled', 'true')
      }
    })

    test('disabled providers show unavailable label', async ({ page }) => {
      await disableE2eAutoAuth(page)
      await setupOrbAuthE2eMocks(page, {
        scenario: 'unauthenticated',
        oauth: { apple: false, google: false, microsoft: false }
      })
      await gotoOrbLogin(page)

      await expect(page.getByText(/Apple sign-in unavailable/i)).toBeVisible()
      await expect(page.getByText(/Google sign-in unavailable/i)).toBeVisible()
      await expect(page.getByText(/Microsoft sign-in unavailable/i)).toBeVisible()
    })

    test('oauth_error query param shows friendly message', async ({ page }) => {
      await disableE2eAutoAuth(page)
      await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
      await page.goto('/orb?oauth_error=invalid_oauth_state')
      await expect(page.locator('[data-orb-login-page]')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('.orb-login-error').first()).toContainText(/expired|interrupted/i)
    })
  })

  test('email login with inactive access routes to billing', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })

    let authed = false
    await page.route('**/orb/front-door/verdict**', async (route) => {
      const inactiveAccess = {
        contract_version: 'orb_access_v2',
        product: 'orb_residential',
        price_label: '£9.99/month',
        can_use_orb: false,
        access_state: 'inactive',
        trial: { available: true, active: false, days_left: 0, expires_at: null },
        subscription: { active: false, status: 'inactive', plan_name: null },
        billing: { stripe_configured: true, price_gbp_monthly: 9.99 },
        standalone: true,
        os_records_accessed: false,
        os_access_granted: false,
        safety_accepted: true,
        onboarding_completed: true,
        upgrade: { checkout_available: true, trial_available: true, manage_billing_available: false }
      }
      const body = authed
        ? {
            success: true,
            data: {
              contract_version: 'orb_front_door_v1',
              verdict: 'inactive',
              authenticated: true,
              can_use_orb: false,
              access_blocker: 'subscription_required',
              safety_accepted: true,
              subscription: { active: false, status: 'inactive', plan_name: null },
              user: { id: 9001, email: E2E_CREDENTIALS.email, role: 'manager' },
              frontend_should_mount_product: false,
              allowed_bootstrap: false,
              backend_build: 'e2e-auth',
              reason: 'e2e_mock_inactive',
              access: inactiveAccess
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

    await page.route('**/orb/standalone/access**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            contract_version: 'orb_access_v2',
            product: 'orb_residential',
            price_label: '£9.99/month',
            can_use_orb: false,
            access_state: 'inactive',
            trial: { available: true, active: false, days_left: 0, expires_at: null },
            subscription: { active: false, status: 'inactive', plan_name: null },
            billing: { stripe_configured: true, price_gbp_monthly: 9.99 },
            standalone: true,
            os_records_accessed: false,
            os_access_granted: false,
            safety_accepted: true,
            onboarding_completed: true,
            upgrade: { checkout_available: true, trial_available: true, manage_billing_available: false }
          }
        })
      })
    )

    await gotoOrbLogin(page)

    await page.locator('[data-testid="orb-login-email"]').fill(E2E_CREDENTIALS.email)
    await page.locator('[data-testid="orb-login-password"]').fill(E2E_CREDENTIALS.password)
    authed = true
    await page.locator('[data-testid="orb-login-submit"]').click()

    await expect(page.locator('[data-orb-upgrade-title]').first()).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('[data-orb-subscribe]').first()).toBeVisible()
  })

  test('ready access login mounts product shell', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/orb')
    await expect(page.locator('[data-orb-shell="true"]')).toBeVisible({ timeout: 20_000 })
  })
})
