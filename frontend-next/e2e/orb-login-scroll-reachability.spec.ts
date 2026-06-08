/**
 * ORB login scroll reachability — Create account, passkey, footer on all key viewports.
 */
import { test, expect } from '@playwright/test'

import {
  ORB_LOGIN_VIEWPORTS,
  assertElementReachable,
  assertLoginMobileScroll,
  assertNoHorizontalOverflow,
  disableE2eAutoAuth,
  expandPasskeyIfNeeded,
  gotoOrbLogin,
  mockWebAuthn,
  setupOrbAuthE2eMocks
} from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB login scroll reachability', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1 to run ORB login scroll E2E')
  test.describe.configure({ timeout: 90_000 })

  for (const viewport of ORB_LOGIN_VIEWPORTS) {
    test(`all CTAs reachable at ${viewport.label}`, async ({ page }) => {
      await mockWebAuthn(page, 'success')
      await disableE2eAutoAuth(page)
      await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await gotoOrbLogin(page)
      await assertLoginMobileScroll(page)
    })
  }

  test('create account links to signup', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 667 })
    await gotoOrbLogin(page)

    const createAccount = page.locator('[data-orb-create-account]')
    await assertElementReachable(page, '[data-orb-create-account]')
    await expect(createAccount).toHaveAttribute('href', '/orb/signup')
  })

  test('passkey toggle and button reachable on compact viewport', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 667 })
    await gotoOrbLogin(page)

    const toggle = page.locator('[data-orb-passkey-toggle]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toContainText(/use passkey/i)
    await expandPasskeyIfNeeded(page)
    await assertElementReachable(page, '[data-orb-passkey-sign-in]')
  })

  test('desktop short viewport reaches CTAs without trapping focus', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 1440, height: 760 })
    await gotoOrbLogin(page)

    await assertElementReachable(page, '[data-orb-create-account]')
    await expandPasskeyIfNeeded(page)
    await assertElementReachable(page, '[data-orb-passkey-sign-in]')
    await assertElementReachable(page, '[data-orb-login-safe-bottom], [data-testid="orb-login-legal-links"]')
    await assertNoHorizontalOverflow(page)

    const focusAudit = await page.evaluate(() => {
      const email = document.querySelector('[data-testid="orb-login-email"]') as HTMLInputElement | null
      email?.focus()
      const focused = document.activeElement === email
      if (email) email.blur()
      return { emailFocusOk: focused }
    })
    expect(focusAudit.emailFocusOk).toBe(true)
  })

  test('brand hierarchy visible on desktop without tag in login card', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoOrbLogin(page)

    await expect(page.locator('[data-orb-login-brand]').first()).toContainText('ORB Residential')
    await expect(page.locator('[data-orb-login-engine-line]').first()).toContainText(
      'Powered by IndiCare Intelligence'
    )
    await expect(page.locator('[data-orb-login-brand-tag]')).toContainText('Care. Connect. Empower.')
    await expect(page.locator('.orb-login-card [data-orb-login-brand-tag]')).toHaveCount(0)

    const brandTop = await page.locator('[data-orb-login-hero-top-aligned] [data-orb-login-brand]').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return { top: rect.top, viewport: window.innerHeight }
    })
    expect(brandTop.top).toBeGreaterThanOrEqual(48)
    expect(brandTop.top / brandTop.viewport).toBeGreaterThanOrEqual(0.1)
    expect(brandTop.top / brandTop.viewport).toBeLessThan(0.28)
  })

  test('legal footer links use www.indicare.co.uk', async ({ page }) => {
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 390, height: 667 })
    await gotoOrbLogin(page)

    await assertElementReachable(page, '[data-testid="orb-login-legal-links"]')
    await expect(page.locator('[data-orb-privacy-link]')).toHaveAttribute(
      'href',
      'https://www.indicare.co.uk/privacy'
    )
    await expect(page.locator('[data-orb-terms-link]')).toHaveAttribute('href', 'https://www.indicare.co.uk/terms')
    await expect(page.locator('[data-orb-cookies-link]')).toHaveAttribute(
      'href',
      'https://www.indicare.co.uk/cookies'
    )
    await expect(page.locator('[data-orb-support-link]')).toHaveAttribute(
      'href',
      'https://www.indicare.co.uk/support'
    )
  })

  test('presentation order: OAuth, create account, email, passkey', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoOrbLogin(page)

    const order = await page.evaluate(() => {
      const selectors = [
        '[data-orb-oauth="apple"]',
        '[data-orb-create-account]',
        '[data-testid="orb-login-email"]',
        '[data-orb-passkey-toggle], #orb-login-passkey'
      ]
      return selectors.map((sel) => {
        const el = document.querySelector(sel)
        return el ? el.getBoundingClientRect().top : null
      })
    })

    expect(order[0]).not.toBeNull()
    expect(order[1]).not.toBeNull()
    expect(order[2]).not.toBeNull()
    expect(order[3]).not.toBeNull()
    expect(order[0]!).toBeLessThan(order[1]!)
    expect(order[1]!).toBeLessThan(order[2]!)
    expect(order[2]!).toBeLessThan(order[3]!)
  })
})
