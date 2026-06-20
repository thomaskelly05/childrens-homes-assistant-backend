import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_ACTIVE_MARKER
} from '../../lib/orb/orb-guided-demo-copy.ts'
import {
  ORB_LOGIN_ENTERPRISE_TITLE,
  ORB_HOME_SAFETY_LINE
} from '../../lib/orb/orb-residential-shell-copy.ts'
import {
  ORB_NAV_RECORDS,
  ORB_REQUEST_DEMO_LABEL
} from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1D showstopper UI', () => {
  it('login hero uses premium headline and request demo link', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(hero, /orb-login-headline--showstopper/)
    assert.match(auth, /data-orb-login-demo-path/)
    assert.equal(ORB_LOGIN_ENTERPRISE_TITLE, 'ORB Residential')
  })

  it('home empty state is a single minimal canvas', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-workspace-home-grid/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.doesNotMatch(companion, /data-orb-workspace-home-rail/)
    assert.match(ORB_HOME_SAFETY_LINE, /professional judgement/)
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
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-showstopper-phase-1d\.css/)
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
    const login = read('components/orb-residential/orb-login-auth-card.tsx')
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
