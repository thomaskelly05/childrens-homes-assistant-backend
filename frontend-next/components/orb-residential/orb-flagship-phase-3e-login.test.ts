import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_LOGIN_CAPABILITY_GROUPS,
  ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE,
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PROFESSIONAL_BOUNDARY
} from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3E premium login entrance', () => {
  it('build version marker is phase-3k-chatgpt-home-message-polish', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3k-chatgpt-home-message-polish')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('login renders premium entrance structure and test hooks', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const screen = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(screen, /OrbLoginScreen/)
    assert.match(screen, /orb-login-shell/)
    assert.match(hero, /data-orb-login-entrance/)
    assert.match(hero, /data-orb-login-brand-promise/)
    assert.match(hero, /data-orb-login-founder-line/)
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.doesNotMatch(hero, /data-orb-login-demo-route/)
  })

  it('login copy includes ethical intelligence, founder line and capability groups', () => {
    assert.match(ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE, /Ethical intelligence/)
    assert.match(ORB_LOGIN_FOUNDER_LINE, /lived experience and professional responsibility/)
    assert.match(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /professional judgement/)
    assert.match(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /does not replace safeguarding procedures/)
    assert.equal(ORB_LOGIN_CAPABILITY_GROUPS.length, 3)
    assert.deepEqual(
      ORB_LOGIN_CAPABILITY_GROUPS.map((g) => g.label),
      ['Think', 'Capture', 'Evidence']
    )
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.doesNotMatch(hero, /ORB_LOGIN_STATION_DESCRIPTIONS/)
    assert.doesNotMatch(hero, /data-orb-login-stations-scroll/)
    assert.doesNotMatch(hero, /Station preview/)
  })

  it('auth card keeps sign-in actions and adult-reviewed boundary', () => {
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(auth, /Welcome to ORB Residential/)
    assert.match(auth, /specialist intelligence workspace/)
    assert.match(auth, /Every output remains adult-reviewed/)
    assert.match(auth, /Continue with Google/)
    assert.match(auth, /Continue with Microsoft/)
    assert.match(auth, /Create ORB account|ORB_LOGIN_CREATE_ACCOUNT_LABEL/)
    assert.match(auth, /Sign in with email/)
    assert.match(auth, /data-orb-login-passkey-section|Use passkey/)
    assert.match(auth, /ORB_LOGIN_DEMO_FOOTER_PREFIX|Interested in ORB Residential/)
    assert.match(auth, /OrbRequestDemoLink|Request a demo/)
    assert.doesNotMatch(auth, /Ofsted approved|guarantees compliance|automates safeguarding|replaces managers/)
  })

  it('login CSS uses capability grid without scrollable station preview', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /\.orb-login-capability-grid/)
    assert.match(css, /\.orb-login-entrance|\.orb-login-brand-panel/)
    assert.doesNotMatch(css, /data-orb-login-stations-scroll/)
    assert.doesNotMatch(css, /\.orb-login-station-preview/)
  })

  it('mobile login entrance includes promise and capability groups', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    assert.match(mobile, /data-orb-login-capability-groups/)
    assert.match(mobile, /data-orb-login-professional-boundary/)
    assert.match(mobile, /Powered by IndiCare Intelligence/)
  })
})
