import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import {
  ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS,
  ORB_RESIDENTIAL_BILLING_PROVIDER_COPY,
  ORB_RESIDENTIAL_BILLING_SUBTITLE
} from '../../lib/orb/orb-residential-ui-copy.ts'
import { ORB_VISIBLE_SIDEBAR_NAV } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential personality pass (Phase 1M)', () => {
  it('layout imports only orb-residential-shell.css', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-theme\.css|orb-shell\.css|orb-mobile\.css|_legacy-ui-archive/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('home includes visible ORB identity mark and premium hero', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /GlassOrbMark/)
    assert.match(companion, /data-orb-identity-mark/)
    assert.match(companion, /orb-workspace-hero--premium/)
    assert.match(companion, /orb-brand-eyebrow/)
    assert.match(css, /orb-home-orb-glow/)
  })

  it('home has one composer and no provider walkthrough card', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    assert.match(companion, /data-orb-composer="main"/)
    assert.match(composer, /orb-composer--premium/)
    assert.doesNotMatch(companion, /orb-guided-demo-continue-card--flagship/)
    assert.doesNotMatch(entry, /Provider walkthrough/)
  })

  it('sidebar includes ORB Residential and approved nav only', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.match(sidebar, /GlassOrbMark/)
    assert.match(sidebar, /data-orb-sidebar-brand/)
    assert.match(sidebar, /ORB Residential/)
    assert.match(sidebar, /RESIDENTIAL_VISIBLE_NAV = ORB_VISIBLE_SIDEBAR_NAV/)
    assert.doesNotMatch(sidebar, /Saved Outputs|Magic Notes/)
  })

  it('dictate keeps one primary start recording action', () => {
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(topBar, /Start recording/)
    assert.match(workspace, /OrbDictateTopBar/)
    assert.doesNotMatch(workspace, /OrbWorkflowStrip/)
  })

  it('voice has one push-to-talk primary action', () => {
    const controls = read('components/orb-standalone/orb-voice-launch-controls.tsx')
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(controls, /data-orb-voice-ptt-primary/)
    assert.match(voice, /orb-workspace--voice/)
  })

  it('records empty state remains minimal with ORB icon', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(panel, /showRecordsEmptyCanvas/)
    assert.match(panel, /data-orb-records-empty/)
    assert.match(panel, /GlassOrbMark/)
    assert.match(css, /\.orb-workspace--records \[data-orb-records-empty\]/)
    assert.doesNotMatch(panel, /data-orb-saved-outputs-filters.*showRecordsEmptyCanvas/s)
  })

  it('billing includes current labels and provider copy', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const uiCopy = read('lib/orb/orb-residential-ui-copy.ts')
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_SUBTITLE/)
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_PROVIDER_COPY/)
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS/)
    assert.equal(ORB_RESIDENTIAL_BILLING_SUBTITLE, 'Specialist intelligence for children\u2019s homes.')
    assert.match(ORB_RESIDENTIAL_BILLING_PROVIDER_COPY, /Provider plans are being shaped/)
    for (const item of ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS) {
      assert.match(uiCopy, new RegExp(`'${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`))
    }
  })

  it('no old shell classes or phase CSS reintroduced', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-flagship-shell|orb-chat-shell|orb-composer-v2/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-convergence-phase|orb-showstopper-phase/)
  })

  it('safety copy remains present but not duplicated excessively on home', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.equal(ORB_HOME_SAFETY_LINE, ORB_HOME_SAFETY_LINE)
    const safetyCount = (companion.match(/ORB_HOME_SAFETY_LINE/g) ?? []).length
    assert.ok(safetyCount <= 2, 'home safety line should not repeat across surfaces')
  })

  it('login includes supporting copy and luminous brand mark', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(hero, /GlassOrbMark/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUPPORTING/)
    assert.match(css, /orb-login-hero-sphere-wrap/)
  })

  it('personality tokens live in the single shell stylesheet', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /--orb-res-orb-glow/)
    assert.match(css, /orb-composer--premium/)
    assert.match(css, /orb-brand-eyebrow/)
    assert.match(css, /data-orb-brain-review-intro/)
  })
})
