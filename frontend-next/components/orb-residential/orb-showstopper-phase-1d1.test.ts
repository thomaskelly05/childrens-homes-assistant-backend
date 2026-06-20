import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_ACTIVE_MARKER
} from '../../lib/orb/orb-guided-demo-copy.ts'
import {
  ORB_HOME_SAFETY_LINE,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_NAV_RECORDS } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const LOW_CONTRAST_BODY_PATTERNS = [
  /orb-login-headline--showstopper[\s\S]{0,120}color:\s*transparent/,
  /background-clip:\s*text[\s\S]{0,80}orb-login-headline/
] as const

describe('ORB Residential Phase 1D.1 contrast and readability', () => {
  it('readability stylesheet is wired after showstopper pass', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-showstopper-phase-1d1\.css/)
    assert.match(css, /--orb-read-text-primary/)
    assert.match(css, /orb-login-auth-card--readable/)
  })

  it('login headline remains visible with navy copy tokens', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.match(hero, /data-orb-login-title/)
    assert.match(auth, /data-orb-login-demo-path/)
    assert.equal(ORB_LOGIN_ENTERPRISE_TITLE, 'ORB Residential')
    assert.doesNotMatch(css, /orb-login-headline--showstopper[\s\S]{0,200}color:\s*transparent\s*!important/)
  })

  it('login auth card uses readable solid surface class', () => {
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(auth, /orb-login-auth-card--readable/)
    assert.match(css, /orb-login-auth-card--readable/)
  })

  it('request demo remains visible on login auth card', () => {
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.equal((auth.match(/<OrbRequestDemoLink/g) ?? []).length, 1)
    assert.match(auth, /surface="login"/)
    assert.match(auth, /data-orb-login-demo-path/)
  })

  it('guided demo marker and trust rail remain present', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_GUIDED_DEMO_ACTIVE_MARKER/)
    assert.match(companion, /data-orb-guided-demo-active-marker/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.match(ORB_HOME_SAFETY_LINE, /local safeguarding procedures/)
    assert.equal(ORB_GUIDED_DEMO_ACTIVE_MARKER, 'Guided Demo \u00b7 anonymised scenario')
  })

  it('guided demo modal uses readable slate copy classes', () => {
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    assert.match(panel, /text-slate-700/)
    assert.match(panel, /text-slate-900/)
    assert.match(panel, /ORB_GUIDED_DEMO_SAFETY_NOTE/)
  })

  it('dictate and write surfaces have readability CSS hooks', () => {
    const css = read('app/orb/orb-residential-shell.css')
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(css, /\[data-orb-dictate-brain-panel\]/)
    assert.match(css, /\[data-orb-write-document-canvas\]/)
    assert.match(css, /\[data-orb-write-guidance-panel\]/)
    assert.match(write, /data-orb-write-analyse/)
    assert.match(write, /text-slate-800/)
  })

  it('primary nav and safety copy remain unchanged', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const visibleNav = sidebar.slice(
      sidebar.indexOf('const RESIDENTIAL_VISIBLE_NAV'),
      sidebar.indexOf('export type OrbResidentialStationId')
    )
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
    assert.match(names, /ORB_NAV_RECORDS = 'Records & Drafts'/)
    assert.doesNotMatch(visibleNav, /Magic Notes|Saved Outputs/)
  })

  it('main body copy avoids known low-contrast gradient text on login headline', () => {
    const css = read('app/orb/orb-residential-shell.css')
    for (const pattern of LOW_CONTRAST_BODY_PATTERNS) {
      assert.doesNotMatch(css, pattern)
    }
    assert.match(css, /background:\s*none\s*!important/)
  })
})
