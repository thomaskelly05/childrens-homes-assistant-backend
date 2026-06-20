import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_LOGIN_CAPABILITY_GROUPS,
  ORB_LOGIN_CREATE_ACCOUNT_LABEL,
  ORB_LOGIN_DEMO_FOOTER_PREFIX,
  ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE,
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PROFESSIONAL_BOUNDARY
} from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3F final login entrance', () => {
  it('build version marker is phase-3l-dictate-capture-workflow', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3l-dictate-capture-workflow')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('login uses single premium entrance copy and hooks', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const screen = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(screen, /OrbLoginScreen/)
    assert.match(screen, /orb-login-shell/)
    assert.match(hero, /data-orb-login-entrance/)
    assert.match(hero, /data-orb-login-brand-promise/)
    assert.match(hero, /data-orb-login-founder-line/)
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.match(hero, /data-orb-login-above-fold/)
    assert.match(ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE, /Ethical intelligence for children/)
  })

  it('founder line and capability promises are visible in copy', () => {
    assert.match(ORB_LOGIN_FOUNDER_LINE, /lived experience and professional responsibility/)
    assert.equal(ORB_LOGIN_CAPABILITY_GROUPS.length, 3)
    assert.match(ORB_LOGIN_CAPABILITY_GROUPS[0].description, /Reflect before you write/)
    assert.match(ORB_LOGIN_CAPABILITY_GROUPS[1].description, /safer adult-reviewed drafts/)
    assert.match(ORB_LOGIN_CAPABILITY_GROUPS[2].description, /child\u2019s voice/)
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.doesNotMatch(hero, /ORB_LOGIN_STATION_DESCRIPTIONS/)
    assert.doesNotMatch(hero, /data-orb-login-stations-scroll/)
    assert.doesNotMatch(hero, /Station preview/)
  })

  it('auth card contains small ORB brand hook and safe copy', () => {
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(auth, /data-orb-login-auth-brand-hook/)
    assert.match(auth, /data-orb-login-auth-mark/)
    assert.match(auth, /GlassOrbMark/)
    assert.match(auth, /Welcome to ORB Residential/)
    assert.match(auth, /Every output remains adult-reviewed/)
    assert.match(auth, /Continue with Google/)
    assert.match(auth, /Continue with Microsoft/)
    assert.match(auth, /Sign in with email/)
    assert.match(auth, /Use passkey/)
    assert.equal(ORB_LOGIN_CREATE_ACCOUNT_LABEL, 'Create ORB account')
    assert.match(auth, /ORB_LOGIN_CREATE_ACCOUNT_LABEL/)
    assert.equal(ORB_LOGIN_DEMO_FOOTER_PREFIX, 'Interested in ORB Residential?')
    assert.match(auth, /ORB_LOGIN_DEMO_FOOTER_PREFIX/)
    assert.match(auth, /OrbRequestDemoLink|Request a demo/)
    assert.doesNotMatch(auth, /Ofsted approved|guarantees compliance|automates safeguarding|replaces managers/)
  })

  it('boundary text supports judgement without overclaiming', () => {
    assert.match(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /supports professional judgement/)
    assert.match(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /does not replace safeguarding procedures/)
    assert.doesNotMatch(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /guarantees|Ofsted approved|automates safeguarding/)
  })

  it('login CSS uses calm capability rows without station preview scroll', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /\.orb-login-capability-grid/)
    assert.match(css, /\.orb-login-auth-mark/)
    assert.match(css, /phase-3l-dictate-capture-workflow/)
    assert.doesNotMatch(css, /data-orb-login-stations-scroll/)
    assert.doesNotMatch(css, /\.orb-login-station-preview/)
  })

  it('desktop hero avoids duplicate demo CTA at bottom', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.doesNotMatch(hero, /data-orb-login-demo-route/)
    assert.doesNotMatch(hero, /Not using ORB yet/)
  })

  it('mobile login renders narrative order with founder line and capabilities', () => {
    const mobile = read('components/orb-residential/orb-login-mobile-header.tsx')
    const brandIdx = mobile.indexOf('data-orb-login-brand')
    const subIdx = mobile.indexOf('data-orb-login-subheadline')
    const founderIdx = mobile.indexOf('data-orb-login-founder-line')
    const capIdx = mobile.indexOf('data-orb-login-capability-groups')
    const boundaryIdx = mobile.indexOf('data-orb-login-professional-boundary')
    assert.ok(brandIdx < subIdx)
    assert.ok(subIdx < founderIdx)
    assert.ok(founderIdx < capIdx)
    assert.ok(capIdx < boundaryIdx)
    assert.doesNotMatch(mobile, /data-orb-login-demo-route/)
  })
})
