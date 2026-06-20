import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS } from '../../lib/orb/orb-residential-ui-copy.ts'
import { ORB_RESIDENTIAL_LOCKED_THEME } from '../../lib/orb/orb-appearance.ts'
import { ORB_VISIBLE_SIDEBAR_NAV } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_ARCHIVED_PHASE_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1I single shell consolidation', () => {
  it('/orb imports only one active ORB Residential UI CSS system', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    for (const archived of ORB_ARCHIVED_PHASE_CSS_FILES) {
      const basename = archived.split('/').pop()!
      assert.doesNotMatch(layout, new RegExp(basename.replace('.', '\\.')))
      assert.ok(existsSync(join(root, archived)), `${archived} should exist in archive`)
    }
  })

  it('orb-layout exposes one primary shell grid, sidebar and main', () => {
    const shell = read('components/orb/orb-layout.tsx')
    assert.match(shell, /orb-app-shell__grid/)
    assert.match(shell, /orb-sidebar/)
    assert.match(shell, /data-orb-sidebar=\{residentialSurface \? 'primary'/)
    assert.match(shell, /orb-main/)
    assert.match(shell, /data-orb-main=\{residentialSurface \? 'workspace'/)
    assert.doesNotMatch(shell, /orb-full-viewport-workspace/)
    assert.doesNotMatch(shell, /orb-residential-sidebar-v2/)
    assert.doesNotMatch(shell, /data-orb-flagship-sidebar/)
  })

  it('orb-care-companion does not nest legacy shell wrappers', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(companion, /data-orb-shell=\{residentialSurface \? 'residential'/)
    assert.doesNotMatch(companion, /orb-flagship-shell/)
    assert.doesNotMatch(companion, /orb-full-viewport-shell/)
    assert.doesNotMatch(companion, /orb-residential-app-shell/)
    assert.doesNotMatch(companion, /orb-residential-app-shell__workspace/)
  })

  it('sidebar visible nav remains the nine approved items', () => {
    const labels = ORB_VISIBLE_SIDEBAR_NAV.map((entry) => entry.label)
    assert.deepEqual(labels, [
      'Home',
      'Chat',
      'Dictate',
      'Voice',
      'Communicate',
      'ORB Write',
      'Records & Drafts',
      'Help & Safety',
      'Settings'
    ])
  })

  it('billing included list avoids legacy product labels', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.doesNotMatch(billing, /'Saved outputs'/)
    assert.doesNotMatch(billing, /'Templates'/)
    assert.doesNotMatch(billing, /'Documents'/)
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Records & Drafts'))
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Help & Safety'))
  })

  it('login uses one login shell without signed-in workspace shell classes', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(login, /orb-login-shell/)
    assert.match(login, /orb-login-shell__grid/)
    assert.doesNotMatch(login, /orb-app-shell/)
    assert.doesNotMatch(login, /orb-login-enterprise/)
    assert.doesNotMatch(login, /orb-login-flagship-shell/)
    assert.doesNotMatch(hero, /orb-login-enterprise-hero/)
    assert.match(hero, /orb-login-shell__brand/)
  })

  it('theme lock remains active', () => {
    const appearance = read('lib/orb/orb-appearance.ts')
    const shellCss = read('app/orb/orb-residential-shell.css')
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
    assert.match(appearance, /ORB_RESIDENTIAL_LOCKED_THEME/)
    assert.match(shellCss, /data-orb-residential='1'/)
  })

  it('guided demo and request a demo remain present', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(companion, /OrbGuidedDemoEntry/)
    assert.match(companion, /data-orb-guided-demo/)
    assert.match(hero, /OrbRequestDemoLink/)
    assert.match(hero, /data-orb-login-demo-path/)
  })

  it('no user-facing Magic Notes or Saved Outputs in residential components', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const banned = ['Magic Notes', 'Saved Outputs', 'Export coming soon']
    for (const label of banned) {
      assert.doesNotMatch(sidebar, new RegExp(label))
      assert.doesNotMatch(companion, new RegExp(`['"]${label}['"]`))
    }
  })

  it('composer appears once in home empty state', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composerMounts = (companion.match(/data-orb-composer-mounted="true"/g) ?? []).length
    assert.equal(composerMounts, 1)
    assert.match(companion, /data-orb-workspace-starters/)
    assert.match(companion, /orb-composer-dock/)
  })

  it('canonical shell CSS defines app shell sidebar and main', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /\.orb-app-shell/)
    assert.match(css, /\.orb-sidebar/)
    assert.match(css, /\.orb-main/)
    assert.match(css, /\.orb-composer-dock/)
    assert.match(css, /\.orb-login-shell/)
    assert.match(css, /\.orb-modal/)
  })
})
