import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_ACTIVE_MARKER,
  ORB_HOME_TRUST_STRIP,
  ORB_LOGIN_HERO_HEADLINE,
  ORB_LOGIN_HERO_SUPPORTING
} from '../../lib/orb/orb-showstopper-copy.ts'
import {
  ORB_NAV_RECORDS,
  ORB_REQUEST_DEMO_LABEL
} from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1D showstopper UI', () => {
  it('login hero uses premium headline and supporting copy', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(hero, /ORB_LOGIN_HERO_HEADLINE/)
    assert.match(hero, /ORB_LOGIN_HERO_SUPPORTING/)
    assert.match(hero, /orb-login-headline--showstopper/)
    assert.match(hero, /orb-login-demo-card/)
    assert.equal(ORB_LOGIN_HERO_HEADLINE, 'Ethical intelligence for children\u2019s homes.')
    assert.match(ORB_LOGIN_HERO_SUPPORTING, /adults who care/)
  })

  it('home empty state exposes trust strip and surface card', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_HOME_TRUST_STRIP/)
    assert.match(companion, /data-orb-home-trust-strip/)
    assert.match(companion, /data-orb-full-viewport-home-grid/)
    assert.match(companion, /data-orb-full-viewport-home-rail/)
    assert.match(ORB_HOME_TRUST_STRIP, /Adult review required/)
    assert.match(ORB_HOME_TRUST_STRIP, /Child-centred recording/)
  })

  it('guided demo active marker appears when demo is active', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('components/orb/orb-layout.tsx')
    assert.match(companion, /ORB_GUIDED_DEMO_ACTIVE_MARKER/)
    assert.match(companion, /data-orb-guided-demo-active-marker/)
    assert.match(companion, /guidedDemoActive=\{residentialSurface && guidedDemoState\.active\}/)
    assert.match(layout, /data-orb-guided-demo-active/)
    assert.equal(ORB_GUIDED_DEMO_ACTIVE_MARKER, 'Guided Demo \u00b7 anonymised scenario')
  })

  it('guided demo modal uses premium panel classes', () => {
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    assert.match(panel, /orb-guided-demo-panel__progress-dots/)
    assert.match(panel, /orb-guided-demo-panel__safety/)
    assert.match(panel, /orb-guided-demo-panel__scenario/)
    assert.match(panel, /orb-guided-demo-panel__primary/)
  })

  it('assistant answers and actions use residential showstopper treatment', () => {
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    const markdown = read('components/orb-standalone/orb-markdown-answer.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(assistant, /orb-assistant-answer-card/)
    assert.match(assistant, /data-orb-response-action-bar-residential/)
    assert.match(assistant, /residentialDemoActions/)
    assert.match(markdown, /orb-markdown-answer--residential/)
    assert.match(companion, /residentialSurface=\{residentialSurface\}/)
  })

  it('composer uses showstopper glass on residential surface', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /orb-composer-glass--showstopper/)
  })

  it('showstopper stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-showstopper-phase-1d\.css/)
  })

  it('primary nav labels and safety copy remain unchanged', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const visibleNav = sidebar.slice(
      sidebar.indexOf('const RESIDENTIAL_VISIBLE_NAV'),
      sidebar.indexOf('export type OrbResidentialStationId')
    )
    assert.match(names, /ORB_NAV_RECORDS = 'Records & Drafts'/)
    assert.match(visibleNav, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
    assert.doesNotMatch(visibleNav, /Magic Notes|Saved Outputs/)
  })

  it('request demo remains a single CTA per intended surface', () => {
    const login = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    const loginDemoCount = (login.match(/<OrbRequestDemoLink/g) ?? []).length
    const entryDemoCount = (entry.match(/<OrbRequestDemoLink/g) ?? []).length
    const panelDemoCount = (panel.match(/<OrbRequestDemoLink/g) ?? []).length
    assert.equal(loginDemoCount, 1)
    assert.equal(entryDemoCount, 1)
    assert.equal(panelDemoCount, 1)
    assert.match(login, /surface="login"/)
    assert.match(login, /data-orb-login-demo-path/)
    assert.equal(ORB_REQUEST_DEMO_LABEL, 'Request a demo')
  })
})
