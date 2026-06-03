import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop UX', () => {
  it('/orb experience wraps chat in dark residential root and error boundary', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const page = readComponent('app/orb/page.tsx')
    assert.match(shell, /useOrbResidentialThemeLock/)
    assert.match(shell, /OrbResidentialErrorBoundary/)
    assert.match(shell, /data-orb-residential="true"/)
    assert.match(page, /OrbShell/)
  })

  it('landing uses one hero sphere without OrbGlow square artefact', () => {
    const door = readComponent('components/orb-residential/orb-front-door.tsx')
    const hero = readComponent('components/orb-residential/ui/orb-hero-sphere.tsx')
    assert.match(door, /OrbHeroSphere/)
    assert.match(door, /useOrbResidentialThemeLock/)
    assert.match(door, /data-orb-residential="true"/)
    assert.doesNotMatch(door, /OrbGlowHero/)
    assert.match(hero, /PremiumMobileOrb/)
    assert.match(hero, /data-orb-hero-sphere/)
    assert.doesNotMatch(hero, /from '@\/components\/orb-standalone\/orb-glow'/)
  })

  it('login uses one hero sphere and dark autofill input class', () => {
    const login = readComponent('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /OrbHeroSphere/)
    assert.match(login, /orb-login-input/)
    assert.match(login, /useOrbResidentialThemeLock/)
    assert.doesNotMatch(login, /OrbGlowHero/)
  })

  it('error boundary hides raw error unless developer mode', () => {
    const boundary = readComponent('components/orb-residential/orb-residential-error-boundary.tsx')
    const orbError = readComponent('app/orb/error.tsx')
    const globalError = readComponent('app/error.tsx')
    assert.match(boundary, /isOrbDeveloperMode/)
    assert.match(boundary, /data-orb-error-developer-detail/)
    assert.match(boundary, /Something went wrong/)
    assert.match(orbError, /isOrbDeveloperMode/)
    assert.doesNotMatch(boundary, /\{error\.message\}[\s\S]*<\/p>\s*<\/div>\s*<\/div>\s*\)/)
    assert.match(globalError, /ORB could not load this workspace properly/)
  })

  it('collectCognitionDisplayLabels guards non-array labels with Array.isArray', () => {
    const agents = readComponent('lib/orb/residential-agents.ts')
    assert.match(agents, /function asArray/)
    assert.match(agents, /Array\.isArray\(value\)/)
  })

  it('review screen guards map targets with mapArray', () => {
    const review = readComponent('components/orb-residential/orb-review-screen.tsx')
    assert.match(review, /function mapArray/)
    assert.match(review, /Array\.isArray\(value\)/)
    assert.doesNotMatch(review, /important_points\?\.map/)
  })

  it('profile hides cognition mode and admin bypass unless developer mode', () => {
    const profile = readComponent('components/orb-standalone/orb-adult-profile-drawer.tsx')
    assert.match(profile, /developerMode && cognitionModeLabel/)
    assert.match(profile, /developerMode && account\.adminBypass/)
    assert.match(profile, /developerMode \? \([\s\S]*data-orb-cognition-preferences/)
  })

  it('desktop empty state uses single GlassOrbMark sphere', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(companion, /GlassOrbMark size="(empty|home)"/)
    assert.doesNotMatch(companion, /variant="mobile"[\s\S]*md:hidden[\s\S]*variant="desktop"[\s\S]*hidden md:flex/)
    assert.match(premiumCss, /glass-orb-mark--empty/)
  })

  it('premium CSS forces dark under data-orb-residential via launch lock', () => {
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(premiumCss, /color-scheme:\s*dark/)
    assert.match(premiumCss, /ORB Residential launch lock/)
    assert.match(premiumCss, /\.orb-chat-layout--residential\.orb-theme-light[\s\S]*color-scheme:\s*dark/)
    assert.match(premiumCss, /--orb-chat-column-max:\s*53\.75rem/)
  })

  it('Ofsted answer sanitizer uses inspection closer not threshold', () => {
    const py = readFileSync(join(root, '../tests/test_orb_professional_curiosity_depth.py'), 'utf8')
    assert.match(py, /test_general_ofsted_sanitize_strips_threshold_closer/)
    assert.match(py, /inspection readiness checklist|evidence review/)
  })
})
