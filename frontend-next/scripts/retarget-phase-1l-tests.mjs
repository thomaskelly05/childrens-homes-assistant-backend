import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

const files = [
  'components/orb-residential/orb-convergence-phase-1h.test.ts',
  'components/orb-residential/orb-full-viewport-phase-1g.test.ts',
  'components/orb-residential/orb-guided-demo-phase-1b.test.ts',
  'components/orb-residential/orb-login-screen-layout.test.ts',
  'components/orb-residential/orb-mobile-simplification.test.ts',
  'components/orb-residential/orb-residential-desktop-convergence.test.ts',
  'components/orb-residential/orb-residential-desktop-premium-simplification.test.ts',
  'components/orb-residential/orb-residential-identity-pass.test.ts',
  'components/orb-residential/orb-residential-orb-presence.test.ts',
  'components/orb-standalone/orb-dictate-write-convergence.test.ts',
  'components/orb/dictate/orb-dictate-studio-premium-polish.test.ts',
  'components/orb/dictate/orb-dictate-recorder-studio-v3.test.ts',
  'components/orb/dictate/orb-dictate-top-weight-reduction.test.ts',
  'lib/orb/dictate/orb-dictate-hero-polish.test.ts'
]

for (const rel of files) {
  const path = join(root, rel)
  let src = readFileSync(path, 'utf8')
  src = src
    .replace(/assert\.match\(hero, \/ORB_LOGIN_ENTERPRISE_TRUST_PILLS\/\)/g, 'assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)')
    .replace(/assert\.match\(hero, \/ORB_LOGIN_ENTERPRISE_SUPPORTING\/\)/g, 'assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)')
    .replace(/assert\.match\(hero, \/ORB_LOGIN_ENTERPRISE_FOUNDER_LINE\/\)/g, 'assert.match(hero, /data-orb-login-demo-path/)')
    .replace(/assert\.match\(hero, \/data-orb-login-supporting\/\)/g, 'assert.match(hero, /data-orb-login-subheadline/)')
    .replace(/assert\.match\(hero, \/data-orb-login-trust-points\/\)/g, 'assert.match(hero, /professional judgement/)')
    .replace(/assert\.match\(hero, \/orb-login-hero-heading-stack\/\)/g, 'assert.match(hero, /orb-login-hero-inner/)')
    .replace(/assert\.match\(hero, \/data-orb-login-hero-heading-stack\/\)/g, 'assert.match(hero, /data-orb-login-hero-visual/)')
    .replace(/assert\.match\(companion, \/data-orb-workspace-home-rail\/\)/g, 'assert.doesNotMatch(companion, /data-orb-workspace-home-rail/)')
    .replace(/assert\.match\(companion, \/ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE\/\)/g, 'assert.match(companion, /Powered by IndiCare Intelligence/)')
    .replace(/assert\.match\(companion, \/data-orb-brand-emotional-line/g, 'assert.doesNotMatch(companion, /data-orb-brand-emotional-line')
    .replace(/assert\.match\(sidebar, \/orb-liquid-glass\/\)/g, 'assert.doesNotMatch(sidebar, /orb-liquid-glass/)')
    .replace(/assert\.match\(workspace, \/OrbDictatePrivacyStrip\/\)/g, 'assert.match(workspace, /data-orb-dictate-safety-footer/)')
    .replace(/assert\.match\(login, \/ORB_DEMO_BEFORE_TRIAL_COPY\/\)/g, 'assert.match(login, /OrbRequestDemoLink/)')
    .replace(/const lineIdx = companion\.indexOf\('data-orb-brand-emotional-line'\)/g, "const lineIdx = companion.indexOf('Powered by IndiCare Intelligence')")
  writeFileSync(path, src)
}

console.log('retargeted', files.length, 'test files')
