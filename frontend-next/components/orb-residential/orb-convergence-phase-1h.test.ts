import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_V2_PLACEHOLDER_CHAT,
  ORB_COMPOSER_V2_PLACEHOLDER_HOME,
  ORB_HOME_V2_HEADLINE,
  ORB_LOGIN_ENTERPRISE_TITLE,
  ORB_RECORDS_V2_EMPTY_SUBTITLE,
  ORB_VOICE_V2_STATUS_COPY
} from '../../lib/orb/orb-convergence-phase-1h-copy.ts'
import { ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS } from '../../lib/orb/orb-flagship-copy.ts'
import { ORB_RESIDENTIAL_LOCKED_THEME, ORB_RESIDENTIAL_THEME_LOCK_COPY } from '../../lib/orb/orb-appearance.ts'
import {
  ORB_CHAT_EMPTY_HEADING,
  ORB_CHAT_EMPTY_SUBLINE,
  ORB_NAV_RECORDS,
  ORB_RECORDS_EMPTY_SUBTITLE,
  ORB_VISIBLE_SIDEBAR_NAV
} from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1H UI convergence', () => {
  it('convergence stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(layout, /orb-convergence-phase-1h\.css/)
    assert.match(css, /orb-residential-app-shell/)
    assert.match(css, /orb-residential-sidebar-v2/)
    assert.match(css, /orb-composer-v2/)
    assert.match(css, /orb-product-modal-v2/)
    assert.match(css, /100dvh/)
  })

  it('app shell uses full viewport grid with 280px sidebar', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const shell = read('components/orb/orb-layout.tsx')
    assert.match(companion, /orb-residential-app-shell/)
    assert.match(shell, /orb-residential-app-shell__workspace/)
    assert.match(shell, /orb-residential-main/)
    assert.match(shell, /orb-residential-sidebar-v2/)
    assert.match(shell, /17\.5rem/)
    assert.match(shell, /data-orb-residential-sidebar-v2/)
  })

  it('approved nav labels remain unchanged', () => {
    const labels = ORB_VISIBLE_SIDEBAR_NAV.map((entry) => entry.label)
    assert.deepEqual(labels, [
      'Home',
      'Chat',
      'Dictate',
      'Voice',
      'ORB Write',
      'Records & Drafts',
      'Help & Safety',
      'Settings'
    ])
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('composer v2 exists on Home and Chat with Phase 1H placeholders', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /orb-composer-v2-dock/)
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_HOME/)
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_CHAT/)
    assert.match(composer, /orb-composer-v2/)
    assert.match(composer, /data-orb-composer-v2/)
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /recording, reflecting on or evidencing/)
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_CHAT, /recording, reflection, evidence/)
  })

  it('login uses enterprise split layout with dark hero panel', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(login, /orb-login-enterprise/)
    assert.match(login, /orb-login-enterprise-shell/)
    assert.match(login, /lg:grid-cols-\[58%_42%\]/)
    assert.match(hero, /orb-login-enterprise-hero/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TRUST_PILLS/)
    assert.match(css, /orb-login-enterprise-hero/)
    assert.equal(ORB_LOGIN_ENTERPRISE_TITLE, 'ORB Residential')
  })

  it('home v2 uses calm centre copy and composer-first layout', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-home-v2/)
    assert.match(companion, /data-orb-home-v2/)
    assert.match(companion, /data-orb-home-v2-empty/)
    assert.match(companion, /data-orb-home-v2-starters/)
    assert.equal(ORB_CHAT_EMPTY_HEADING, ORB_HOME_V2_HEADLINE)
    assert.match(ORB_CHAT_EMPTY_SUBLINE, /child\u2019s experience central/)
  })

  it('dictate has modern capture workspace classes', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(workspace, /orb-dictate-v2-workspace/)
    assert.match(workspace, /data-orb-dictate-v2-workspace/)
    assert.match(css, /orb-dictate-v2-workspace/)
  })

  it('voice has premium voice room classes and copy', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(voice, /orb-voice-v2-room/)
    assert.match(voice, /ORB_VOICE_V2_STATUS_COPY/)
    assert.match(voice, /data-orb-voice-v2-status/)
    assert.match(css, /orb-voice-v2-room/)
    assert.match(ORB_VOICE_V2_STATUS_COPY, /Talk it through/)
  })

  it('ORB Write has editor workspace and guidance panel markers', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    const guidance = read('components/orb-write/orb-write-guidance-panel.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(write, /orb-write-v2-workspace/)
    assert.match(write, /data-orb-write-v2-workspace/)
    assert.match(guidance, /data-orb-write-guidance-panel/)
    assert.match(css, /orb-write-v2-workspace/)
  })

  it('records empty state uses Records & Drafts language', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /orb-records-v2-workspace/)
    assert.match(panel, /data-orb-records-empty/)
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
    assert.equal(ORB_RECORDS_EMPTY_SUBTITLE, ORB_RECORDS_V2_EMPTY_SUBTITLE)
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Save from Chat, Dictate, Voice or ORB Write/)
  })

  it('modals use shared product modal v2 class', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const css = read('app/orb/orb-convergence-phase-1h.css')
    assert.match(help, /orb-product-modal-v2/)
    assert.match(help, /data-orb-product-modal-v2/)
    assert.match(settings, /orb-product-modal-v2/)
    assert.match(billing, /orb-product-modal-v2/)
    assert.match(css, /orb-product-modal-v2/)
  })

  it('dark and system mode remain locked out', () => {
    const themeLock = read('app/orb/orb-theme-lock-phase-1e.css')
    const appearance = read('lib/orb/orb-appearance.ts')
    assert.match(themeLock, /orb-theme-lock/)
    assert.match(appearance, /ORB_RESIDENTIAL_LOCKED_THEME/)
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
    assert.match(ORB_RESIDENTIAL_THEME_LOCK_COPY, /fixed light/)
  })

  it('no legacy primary labels in residential UI surfaces', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const banned = ['Saved Outputs', 'Magic Notes', 'Export coming soon']
    for (const label of banned) {
      assert.doesNotMatch(sidebar, new RegExp(label))
      assert.doesNotMatch(billing, new RegExp(`['"]${label}['"]`))
    }
    assert.doesNotMatch(billing, /'Saved outputs'/)
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Records & Drafts'))
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Help & Safety'))
  })
})
