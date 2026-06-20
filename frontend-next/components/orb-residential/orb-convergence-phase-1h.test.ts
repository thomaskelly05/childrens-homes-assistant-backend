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
} from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS, ORB_VOICE_STATUS_CARD_COPY } from '../../lib/orb/orb-flagship-copy.ts'
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

describe('ORB Residential canonical shell (Phase 1H copy retained)', () => {
  it('residential shell stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-convergence-phase-1h\.css/)
    assert.match(css, /\.orb-app-shell/)
    assert.match(css, /\.orb-sidebar/)
    assert.match(css, /100dvh/)
  })

  it('app shell uses full viewport grid with 280px sidebar', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const shell = read('components/orb/orb-layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(companion, /data-orb-shell=\{residentialSurface \? 'residential'/)
    assert.match(shell, /orb-app-shell__grid/)
    assert.match(shell, /orb-sidebar/)
    assert.match(shell, /17\.5rem/)
    assert.match(shell, /data-orb-sidebar=\{residentialSurface \? 'primary'/)
  })

  it('approved nav labels remain unchanged', () => {
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
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('composer exists on Home and Chat with Phase 1H placeholders', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /orb-composer-dock/)
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_HOME/)
    assert.match(composer, /orb-composer/)
    assert.match(composer, /data-orb-composer/)
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /Ask ORB what you need help thinking through/)
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_CHAT, /Ask ORB what you need help thinking through/)
  })

  it('login uses enterprise split layout with dark brand panel', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(login, /orb-login-shell/)
    assert.match(login, /orb-login-shell__grid/)
    assert.match(login, /lg:grid-cols-\[58%_42%\]/)
    assert.match(hero, /orb-login-shell__brand/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(css, /orb-login-shell__brand/)
    assert.equal(ORB_LOGIN_ENTERPRISE_TITLE, 'ORB Residential')
  })

  it('home uses calm centre copy and composer-first layout', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-workspace--home/)
    assert.match(companion, /data-orb-workspace-home/)
    assert.match(companion, /data-orb-home-empty/)
    assert.doesNotMatch(companion, /data-orb-workspace-starters/)
    assert.equal(ORB_CHAT_EMPTY_HEADING, ORB_HOME_V2_HEADLINE)
    assert.match(ORB_CHAT_EMPTY_SUBLINE, /child\u2019s experience central/)
  })

  it('dictate has modern capture workspace classes', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(workspace, /orb-workspace--dictate/)
    assert.match(workspace, /data-orb-workspace-dictate/)
    assert.match(css, /\.orb-workspace--dictate/)
  })

  it('voice has premium voice room classes and copy', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(voice, /orb-workspace--voice/)
    assert.match(voice, /ORB_VOICE_STATUS_CARD_COPY/)
    assert.match(voice, /data-orb-voice-status/)
    assert.match(css, /\.orb-workspace--voice/)
    assert.match(ORB_VOICE_STATUS_CARD_COPY, /reflective support/)
  })

  it('ORB Write has editor workspace and guidance panel markers', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    const guidance = read('components/orb-write/orb-write-guidance-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(write, /orb-workspace--write/)
    assert.match(write, /data-orb-workspace-write/)
    assert.match(guidance, /data-orb-write-guidance-panel/)
    assert.match(css, /\.orb-workspace--write/)
  })

  it('records empty state uses Records & Drafts language', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /orb-workspace--records/)
    assert.match(panel, /data-orb-records-empty/)
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
    assert.equal(ORB_RECORDS_EMPTY_SUBTITLE, ORB_RECORDS_V2_EMPTY_SUBTITLE)
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Saved adult-reviewed outputs from Chat, Dictate, Voice, Communicate and ORB Write/)
  })

  it('modals use shared product modal class', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(help, /orb-modal/)
    assert.match(help, /data-orb-modal="product"/)
    assert.match(settings, /orb-modal/)
    assert.match(billing, /orb-modal/)
    assert.match(css, /\.orb-modal/)
  })

  it('dark and system mode remain locked out', () => {
    const appearance = read('lib/orb/orb-appearance.ts')
    const shellCss = read('app/orb/orb-residential-shell.css')
    assert.match(appearance, /ORB_RESIDENTIAL_LOCKED_THEME/)
    assert.match(shellCss, /data-orb-residential='1'/)
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
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Records & Drafts'))
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Help & Safety'))
  })
})
