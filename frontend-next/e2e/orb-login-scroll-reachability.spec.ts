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

  test('desktop short viewport card scrolls without trapping focus', async ({ page }) => {
    await mockWebAuthn(page, 'success')
    await disableE2eAutoAuth(page)
    await setupOrbAuthE2eMocks(page, { scenario: 'unauthenticated' })
    await page.setViewportSize({ width: 1440, height: 760 })
    await gotoOrbLogin(page)

    const scrollAudit = await page.evaluate(() => {
      const card = document.querySelector('.orb-login-card') as HTMLElement | null
      const panel = document.querySelector('.orb-login-panel') as HTMLElement | null
      const root = document.querySelector('.orb-login-root') as HTMLElement | null
      const hosts = [card, panel, root, document.documentElement].filter(Boolean) as HTMLElement[]
      const canScroll = hosts.some((host) => host.scrollHeight > host.clientHeight + 8)
      const pageScrollable = document.documentElement.scrollHeight > window.innerHeight + 8
      return { canScroll: canScroll || pageScrollable }
    })
    expect(scrollAudit.canScroll).toBe(true)

    await assertElementReachable(page, '[data-orb-create-account]')
    await expandPasskeyIfNeeded(page)
    await assertElementReachable(page, '[data-orb-passkey-sign-in]')
    await assertNoHorizontalOverflow(page)
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
