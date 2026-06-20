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
  ORB_HOME_TRUST_STRIP,
  ORB_LOGIN_HERO_HEADLINE
} from '../../lib/orb/orb-showstopper-copy.ts'
import { ORB_RESIDENTIAL_LOCKED_THEME, ORB_RESIDENTIAL_THEME_LOCK_COPY } from '../../lib/orb/orb-appearance.ts'
import {
  ORB_DICTATE_SUBTITLE,
  ORB_DICTATE_TITLE,
  ORB_NAV_RECORDS,
  ORB_RECORDS_EMPTY_SUBTITLE
} from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1F flagship UI', () => {
  it('flagship stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-flagship-phase-1f.css')
    assert.match(layout, /orb-flagship-phase-1f\.css/)
    assert.match(css, /--orb-flagship-navy/)
    assert.match(css, /orb-login-flagship-shell/)
    assert.match(css, /data-orb-flagship-sidebar/)
  })

  it('login uses flagship layout classes', () => {
    const screen = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(screen, /orb-login-flagship-shell/)
    assert.match(hero, /orb-login-flagship-hero/)
    assert.match(auth, /orb-login-flagship-auth/)
    assert.equal(ORB_LOGIN_HERO_HEADLINE, 'Ethical intelligence for children\u2019s homes.')
  })

  it('home has substantial guided demo card and product context row', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    assert.match(companion, /orb-flagship-home/)
    assert.match(companion, /ORB_HOME_PRODUCT_CONTEXT_ROW/)
    assert.match(companion, /data-orb-home-product-context/)
    assert.match(companion, /orb-guided-demo-continue-card--flagship/)
    assert.match(entry, /orb-guided-demo-entry--flagship/)
    assert.equal(ORB_HOME_PRODUCT_CONTEXT_ROW, 'Chat \u00b7 Dictate \u00b7 Voice \u00b7 ORB Write \u00b7 Records & Drafts')
    assert.match(ORB_HOME_TRUST_STRIP, /Adult review required/)
  })

  it('guided demo modal uses flagship two-column layout', () => {
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    assert.match(panel, /orb-guided-demo-panel__sheet--flagship/)
    assert.match(panel, /orb-flagship-guided-demo-grid/)
    assert.match(panel, /data-orb-guided-demo-preview/)
    assert.match(panel, /data-orb-guided-demo-safety-note/)
  })

  it('dictate has premium workspace sections', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /orb-flagship-dictate-workspace/)
    assert.match(workspace, /data-orb-flagship-dictate-header/)
    assert.match(workspace, /ORB_DICTATE_TITLE/)
    assert.match(workspace, /ORB_DICTATE_SUBTITLE/)
    assert.equal(ORB_DICTATE_TITLE, 'Dictate')
    assert.match(ORB_DICTATE_SUBTITLE, /Speak or paste rough notes/)
  })

  it('voice has reflective support status card', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(voice, /orb-flagship-voice-room/)
    assert.match(voice, /data-orb-voice-status-card/)
    assert.match(voice, /ORB_VOICE_STATUS_CARD_COPY/)
    assert.match(ORB_VOICE_STATUS_CARD_COPY, /reflective support/)
    assert.match(ORB_VOICE_STATUS_CARD_COPY, /Audio is not stored/)
  })

  it('records and drafts empty state copy guides next actions', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
    assert.match(panel, /data-orb-saved-start-write/)
    assert.match(panel, /data-orb-saved-start-dictate/)
    assert.match(panel, /data-orb-saved-open-guided-demo/)
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Guided Demo/)
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('billing does not list Saved outputs, Templates or Documents as primary included items', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS/)
    assert.doesNotMatch(billing, /'Saved outputs'/)
    assert.doesNotMatch(billing, /'Templates'/)
    assert.doesNotMatch(billing, /'Documents'/)
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Records & Drafts'))
    assert.ok(ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS.includes('Help & Safety'))
  })

  it('settings fixed light copy remains and help uses flagship modal treatment', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const control = read('components/orb-standalone/orb-appearance-control.tsx')
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    assert.match(settings, /data-orb-settings-appearance-lock-note/)
    assert.match(settings, /data-orb-flagship-product-modal/)
    assert.match(control, /ORB_RESIDENTIAL_THEME_LOCK_COPY/)
    assert.match(help, /data-orb-flagship-product-modal/)
    assert.match(ORB_RESIDENTIAL_THEME_LOCK_COPY, /fixed light interface/)
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
  })

  it('signed-in shell uses dark navy flagship sidebar without renaming nav', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(layout, /data-orb-flagship-sidebar/)
    assert.match(companion, /orb-flagship-shell/)
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.doesNotMatch(sidebar, /Saved outputs/)
  })

  it('ORB Write uses flagship editor workspace classes', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(write, /orb-flagship-write-workspace/)
    assert.match(write, /data-orb-flagship-write-workspace/)
  })
})
