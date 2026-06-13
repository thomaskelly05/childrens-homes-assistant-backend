/**
 * ORB overlay panels — settings, billing, account menu, sidebar drawer containment.
 * Requires NEXT_PUBLIC_E2E_TEST_MODE=1.
 */
import { test, expect } from '@playwright/test'

import { setupOrbE2eMocks } from './orb-audit-helpers'

const e2eEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1'

test.describe('ORB overlay containment', () => {
  test.skip(!e2eEnabled, 'Set NEXT_PUBLIC_E2E_TEST_MODE=1')

  test.use({ viewport: { width: 390, height: 740 } })

  test('sidebar drawer scrolls internally without page scroll', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-orb-mobile-menu]').click()
    await page.locator('.orb-chat-sidebar').waitFor({ state: 'visible' })

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const sidebar = document.querySelector('.orb-chat-sidebar')
      const closeBtn = document.querySelector('[aria-label="Close sidebar"]')
      const sidebarRect = sidebar?.getBoundingClientRect()
      const closeRect = closeBtn?.getBoundingClientRect()
      const issues: string[] = []
      if (document.documentElement.scrollHeight > vh + 4) {
        issues.push(`page scroll ${document.documentElement.scrollHeight}`)
      }
      if (sidebarRect && sidebarRect.height > vh + 4) {
        issues.push(`sidebar taller than viewport ${Math.round(sidebarRect.height)}`)
      }
      if (closeRect && closeRect.top > vh) issues.push('close overlay below viewport')
      const style = sidebar ? window.getComputedStyle(sidebar) : null
      const scrollable = style?.overflowY === 'auto' || style?.overflowY === 'scroll'
      return { issues, scrollable, sidebarHeight: sidebarRect?.height }
    })

    expect(audit.scrollable).toBe(true)
    expect(audit.issues, JSON.stringify(audit)).toEqual([])
  })

  test('account menu fits viewport', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-orb-mobile-account]').click()
    await page.locator('[data-orb-account-menu]').waitFor({ state: 'visible' })

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const menu = document.querySelector('[data-orb-account-menu]')
      const rect = menu?.getBoundingClientRect()
      const style = menu ? window.getComputedStyle(menu) : null
      const issues: string[] = []
      if (document.documentElement.scrollHeight > vh + 4) {
        issues.push(`page scroll ${document.documentElement.scrollHeight}`)
      }
      if (rect && rect.bottom > vh + 4) issues.push(`menu bottom ${Math.round(rect.bottom)}`)
      if (rect && rect.height > vh) issues.push(`menu height ${Math.round(rect.height)}`)
      return {
        issues,
        overflowY: style?.overflowY,
        maxHeight: style?.maxHeight
      }
    })

    expect(audit.overflowY).toMatch(/auto|scroll/)
    expect(audit.issues, JSON.stringify(audit)).toEqual([])
  })

  test('settings panel scrolls internally', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-orb-mobile-account]').click()
    await page.locator('[data-orb-account-menu-item="settings"]').click()
    await page.locator('[data-orb-settings-panel]').waitFor({ state: 'visible', timeout: 10_000 })

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const panel = document.querySelector('[data-orb-settings-panel]')
      const drawer = document.querySelector('[data-orb-settings-drawer]')
      const scroll = document.querySelector('[data-orb-settings-scroll]')
      const rect = (drawer ?? panel)?.getBoundingClientRect()
      const issues: string[] = []
      if (document.documentElement.scrollHeight > vh + 4) {
        issues.push(`page scroll ${document.documentElement.scrollHeight}`)
      }
      if (rect && rect.bottom > vh + 4) issues.push(`panel bottom ${Math.round(rect.bottom)}`)
      const scrollStyle = scroll ? window.getComputedStyle(scroll) : null
      const bodyStyle = document.querySelector('.orb-panel-body')
        ? window.getComputedStyle(document.querySelector('.orb-panel-body')!)
        : null
      return {
        issues,
        scrollOverflow: scrollStyle?.overflowY,
        bodyOverflow: bodyStyle?.overflowY,
        panelBottom: rect?.bottom
      }
    })

    expect(audit.issues, JSON.stringify(audit)).toEqual([])
    expect(audit.scrollOverflow === 'auto' || audit.bodyOverflow === 'auto').toBe(true)
  })

  test('billing modal sticky footer visible', async ({ page }) => {
    await setupOrbE2eMocks(page)
    await page.goto('/orb')
    await page.locator('[data-orb-shell="true"]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-orb-mobile-account]').click()
    await page.locator('[data-orb-account-menu-item="billing"]').click()
    await page.locator('[data-orb-billing-modal]').waitFor({ state: 'visible', timeout: 10_000 })
    await page
      .locator('[data-orb-billing-subscription-status]')
      .filter({ hasNotText: '—' })
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })

    const audit = await page.evaluate(() => {
      const vh = window.innerHeight
      const modal = document.querySelector('[data-orb-billing-modal]')
      const footer = document.querySelector('[data-orb-billing-sticky-footer]')
      const modalRect = modal?.getBoundingClientRect()
      const footerRect = footer?.getBoundingClientRect()
      const issues: string[] = []
      if (document.documentElement.scrollHeight > vh + 4) {
        issues.push(`page scroll ${document.documentElement.scrollHeight}`)
      }
      if (modalRect && modalRect.bottom > vh + 4) issues.push(`modal bottom ${Math.round(modalRect.bottom)}`)
      if (!footerRect || footerRect.height < 8) issues.push('sticky footer missing')
      if (footerRect && footerRect.bottom > vh + 4) issues.push(`footer bottom ${Math.round(footerRect.bottom)}`)
      const body = document.querySelector('[data-orb-app-panel-name="billing"] .orb-panel-body')
      const bodyStyle = body ? window.getComputedStyle(body) : null
      return {
        issues,
        footerVisible: footerRect ? footerRect.top < vh && footerRect.bottom <= vh + 4 : false,
        bodyOverflow: bodyStyle?.overflowY
      }
    })

    expect(audit.footerVisible, JSON.stringify(audit)).toBe(true)
    expect(audit.issues, JSON.stringify(audit)).toEqual([])
  })
})
