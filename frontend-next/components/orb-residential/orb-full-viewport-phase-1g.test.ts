import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS,
  ORB_VOICE_STATUS_CARD_COPY
} from '../../lib/orb/orb-flagship-copy.ts'
import {
  ORB_HOME_PRODUCT_CONTEXT_ROW,
  ORB_HOME_TRUST_STRIP
} from '../../lib/orb/orb-showstopper-copy.ts'
import { ORB_RESIDENTIAL_LOCKED_THEME, ORB_RESIDENTIAL_THEME_LOCK_COPY } from '../../lib/orb/orb-appearance.ts'
import { ORB_NAV_RECORDS, ORB_RECORDS_PANEL_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1G full viewport workspace', () => {
  it('full viewport stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-full-viewport-phase-1g.css')
    assert.match(layout, /orb-full-viewport-phase-1g\.css/)
    assert.match(css, /--orb-sidebar-width:\s*17\.5rem/)
    assert.match(css, /orb-full-viewport-shell/)
    assert.match(css, /--orb-product-panel-max/)
  })

  it('signed-in shell uses full viewport workspace classes', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const shell = read('components/orb/orb-layout.tsx')
    assert.match(companion, /orb-full-viewport-shell/)
    assert.match(shell, /orb-full-viewport-workspace/)
    assert.match(shell, /orb-full-viewport-main/)
    assert.match(shell, /data-orb-full-viewport-sidebar/)
    assert.match(shell, /17\.5rem/)
  })

  it('login uses full viewport landing layout', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(login, /orb-login-full-viewport/)
    assert.match(login, /orb-login-full-viewport-shell/)
    assert.match(login, /lg:grid-cols-\[58%_42%\]/)
    assert.match(hero, /orb-login-full-viewport-hero/)
    assert.doesNotMatch(login, /max-w-\[88rem\]/)
  })

  it('home uses full workspace grid with rail and starters', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-full-viewport-home/)
    assert.match(companion, /data-orb-full-viewport-home-grid/)
    assert.match(companion, /data-orb-full-viewport-home-main/)
    assert.match(companion, /data-orb-full-viewport-home-rail/)
    assert.match(companion, /orb-full-viewport-starter-grid/)
    assert.match(companion, /data-orb-full-viewport-safety-panel/)
    assert.match(companion, /ORB_HOME_PRODUCT_CONTEXT_ROW/)
    assert.match(ORB_HOME_TRUST_STRIP, /Adult review required/)
    assert.equal(ORB_HOME_PRODUCT_CONTEXT_ROW, 'Chat \u00b7 Dictate \u00b7 Voice \u00b7 ORB Write \u00b7 Records & Drafts')
  })

  it('chat uses full viewport column with readable inner width', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-full-viewport-chat-column/)
    assert.match(companion, /orb-full-viewport-chat-inner/)
    assert.match(companion, /orb-full-viewport-composer-dock/)
  })

  it('dictate uses two-panel full viewport workspace', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const css = read('app/orb/orb-full-viewport-phase-1g.css')
    assert.match(workspace, /orb-full-viewport-dictate-workspace/)
    assert.match(workspace, /data-orb-full-viewport-dictate-workspace/)
    assert.match(css, /orb-full-viewport-dictate-workspace/)
  })

  it('voice has status card and full room class', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(voice, /orb-full-viewport-voice-room/)
    assert.match(voice, /data-orb-voice-status-card/)
    assert.match(ORB_VOICE_STATUS_CARD_COPY, /reflective support/)
  })

  it('write uses flagship full editor workspace', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(write, /orb-full-viewport-write-workspace/)
    assert.match(write, /data-orb-full-viewport-write-workspace/)
  })

  it('records uses full workspace empty state', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /orb-full-viewport-records-workspace/)
    assert.match(panel, /ORB_RECORDS_PANEL_SUBTITLE/)
    assert.match(ORB_RECORDS_PANEL_SUBTITLE, /adult review/)
    assert.match(panel, /data-orb-saved-open-guided-demo/)
  })

  it('modals use larger product panel classes', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(help, /data-orb-product-panel-modal/)
    assert.match(settings, /data-orb-product-panel-modal/)
    assert.match(billing, /data-orb-product-panel-modal/)
  })

  it('nav unchanged and billing included items aligned', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.doesNotMatch(billing, /'Saved outputs'/)
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Records & Drafts'))
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Help & Safety'))
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('settings fixed light copy remains', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-appearance-lock-note/)
    assert.match(ORB_RESIDENTIAL_THEME_LOCK_COPY, /fixed light interface/)
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
  })
})
