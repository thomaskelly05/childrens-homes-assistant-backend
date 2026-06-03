import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB residential theme runtime', () => {
  it('applyOrbResidentialTheme is the single document theme writer', () => {
    const theme = read('lib/orb/orb-residential-theme.ts')
    assert.match(theme, /export function applyOrbResidentialTheme/)
    assert.match(theme, /dataset\.orbTheme/)
    assert.match(theme, /orb-theme-light/)
    assert.match(theme, /getOrbThemeCssVariables/)
    const hook = read('components/orb-standalone/use-orb-appearance.ts')
    assert.match(hook, /applyOrbResidentialTheme/)
    const provider = read('components/orb-standalone/orb-appearance-provider.tsx')
    assert.match(provider, /applyOrbResidentialTheme/)
    const sync = read('components/orb-residential/use-orb-residential-theme-sync.ts')
    assert.match(sync, /applyOrbResidentialTheme/)
    assert.doesNotMatch(sync, /removeAttribute\('data-orb-theme'\)/)
  })

  it('orb layout wraps routes in OrbAppearanceProvider', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /OrbResidentialThemeRoot/)
    const themeRoot = read('app/orb/orb-theme-root.tsx')
    assert.match(themeRoot, /OrbAppearanceProvider/)
  })

  it('theme switch applies html body shell layout data-orb-theme without reload', () => {
    const theme = read('lib/orb/orb-residential-theme.ts')
    assert.match(theme, /data-orb-shell="true"/)
    assert.match(theme, /data-orb-companion-root="true"/)
    assert.match(theme, /\.orb-chat-layout--residential/)
    assert.match(theme, /document\.body/)
  })

  it('system appearance keeps selected mode while resolved theme uses time of day', () => {
    const appearance = read('lib/orb/orb-appearance.ts')
    assert.match(appearance, /resolveOrbThemeFromTimeOfDay/)
    const control = read('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(control, /id: 'system'/)
    const provider = read('components/orb-standalone/orb-appearance-provider.tsx')
    assert.match(provider, /appearanceMode !== 'system'/)
    assert.match(provider, /msUntilNextOrbSystemThemeBoundary/)
  })

  it('OrbPresence renders living sphere not static PNG', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    assert.match(presence, /OrbSphere/)
    assert.doesNotMatch(presence, /OrbBrandImage|orb-brand\.png/)
    const sphere = read('components/orb-core/orb-sphere.tsx')
    assert.match(sphere, /orb-living-sphere/)
    assert.match(sphere, /data-orb-living-sphere/)
    assert.doesNotMatch(sphere, /orb-sphere-depth|orb-sphere-liquid/)
    const brandCss = read('app/orb/orb-brand-asset.css')
    assert.doesNotMatch(brandCss, /\.orb-sphere-wrap[\s\S]*display:\s*none/)
    assert.match(brandCss, /\.orb-brand-image[\s\S]*display:\s*none/)
  })

  it('living sphere CSS is cross-browser without blend-mode-only visibility', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.match(premium, /\.orb-living-sphere/)
    assert.match(premium, /radial-gradient/)
    assert.match(premium, /border-radius:\s*9999px/)
    assert.match(premium, /opacity:\s*1/)
  })

  it('login OAuth uses theme tokens not white-on-white', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /getOrbThemeCssVariables/)
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.match(premium, /\.orb-login-root--light \.orb-auth-button--enabled/)
    assert.match(premium, /var\(--orb-res-text|#0f172a/)
    assert.doesNotMatch(
      premium.match(/\.orb-login-root--light \.orb-auth-button--enabled[\s\S]*?}/)?.[0] ?? '',
      /color:\s*#fff|color:\s*white/
    )
  })

  it('registers ORB_THEME_AUDIT ORB_ORB_AUDIT ORB_RESIDENTIAL_FULL_AUDIT', () => {
    const audit = read('components/orb-standalone/orb-ui-audit.ts')
    assert.match(audit, /export function runOrbThemeAudit/)
    assert.match(audit, /export function runOrbOrbAudit/)
    assert.match(audit, /export function runOrbResidentialFullAudit/)
    assert.match(audit, /ORB_THEME_AUDIT/)
    assert.match(audit, /ORB_ORB_AUDIT/)
    assert.match(audit, /ORB_RESIDENTIAL_FULL_AUDIT/)
    assert.match(audit, /visibleSphereCount/)
    assert.match(audit, /hiddenSphereCount/)
    assert.match(audit, /failures/)
    assert.match(audit, /overlapsMainHeading/)
  })

  it('voice and dictate stations use OrbPresence', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(voice, /OrbPresence|GlassOrbMark/)
    assert.match(dictate, /OrbPresence|GlassOrbMark/)
  })

  it('no unscoped residential dark lock on workspace inputs', () => {
    const mobile = read('app/orb/orb-mobile.css')
    assert.doesNotMatch(mobile, /launch lock/)
    assert.match(mobile, /orb-theme-light/)
    assert.match(mobile, /orb-theme-dark/)
  })
})
