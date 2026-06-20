import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential two-theme system', () => {
  it('theme source defaults residential to light with semantic tokens', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(theme, /ORB_RESIDENTIAL_DEFAULT_THEME[\s\S]*'light'/)
    assert.match(theme, /ORB_RES_CSS_VARS/)
    for (const token of [
      '--orb-res-bg',
      '--orb-res-surface',
      '--orb-res-card',
      '--orb-res-text',
      '--orb-res-primary',
      '--orb-res-input-bg'
    ]) {
      assert.match(theme, new RegExp(token))
    }
    assert.doesNotMatch(theme, /ORB_RESIDENTIAL_RESOLVED_THEME/)
  })

  it('appearance defaults residential to light and bootstrap locks theme', () => {
    const appearance = readComponent('lib/orb/orb-appearance.ts')
    assert.match(appearance, /ORB_RESIDENTIAL_DEFAULT_APPEARANCE[\s\S]*'light'/)
    assert.match(appearance, /ORB_RESIDENTIAL_LOCKED_THEME/)
    assert.match(appearance, /resolveOrbResidentialTheme/)
    assert.match(appearance, /data-orb-theme-locked/)
    assert.match(appearance, /readOrbAppearanceMode\(options\?: \{ residential\?: boolean \}\)/)
    assert.doesNotMatch(appearance, /prefers-color-scheme/)
    assert.doesNotMatch(appearance, /var theme='dark'/)
  })

  it('OrbShell applies resolved theme from useOrbAppearance once', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    assert.match(shell, /useOrbAppearance/)
    assert.match(shell, /useOrbResidentialThemeSync/)
    assert.match(shell, /data-orb-theme=\{resolvedTheme\}/)
    assert.match(shell, /getOrbThemeCssVariables\(resolvedTheme\)/)
    assert.match(shell, /orb-theme-light.*orb-theme-dark|resolvedTheme === 'light'/)
    assert.doesNotMatch(shell, /ORB_RESIDENTIAL_RESOLVED_THEME/)
    assert.doesNotMatch(shell, /orb-theme-dark`\}/)
  })

  it('theme sync hook applies document attributes from resolved theme', () => {
    const sync = readComponent('components/orb-residential/use-orb-residential-theme-sync.ts')
    assert.match(sync, /resolvedTheme/)
    assert.match(sync, /applyOrbResidentialTheme/)
    assert.doesNotMatch(sync, /applyOrbDocumentTheme/)
    assert.doesNotMatch(sync, /ORB_RESIDENTIAL_RESOLVED_THEME/)
  })

  it('care companion forces light theme for residential surface', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /const effectiveTheme = residentialSurface \? 'light' : resolvedTheme/)
    assert.match(companion, /data-orb-theme=\{effectiveTheme\}/)
    assert.doesNotMatch(companion, /residentialSurface \? 'dark' : resolvedTheme/)
  })

  it('settings locks appearance control on residential surface', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const control = readComponent('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(settings, /residentialLocked=\{residentialSurface\}/)
    assert.match(settings, /data-orb-settings-appearance-lock-note/)
    assert.match(control, /data-orb-appearance-locked/)
    assert.match(control, /disabled=\{residentialLocked/)
    assert.match(control, /ORB_RESIDENTIAL_THEME_LOCK_COPY|lockCopy/)
  })

  it('useOrbAppearance exposes residential theme lock on /orb routes', () => {
    const hook = readComponent('components/orb-standalone/use-orb-appearance.ts')
    assert.match(hook, /readOrbAppearanceMode\(\{ residential/)
    assert.match(hook, /resolveOrbResidentialTheme/)
    assert.match(hook, /residentialThemeLocked/)
  })

  it('no duplicate theme lock hook file', () => {
    let threw = false
    try {
      readComponent('components/orb-residential/use-orb-residential-theme-lock.ts')
    } catch {
      threw = true
    }
    assert.equal(threw, true)
  })

  it('orb layout loads static brand asset stylesheet', () => {
    const layout = readComponent('app/orb/layout.tsx')
    assert.doesNotMatch(layout, /orb-theme\.css/)
    const brand = readComponent('components/orb-core/orb-brand-image.tsx')
    assert.match(brand, /ORB_BRAND_IMAGE_SRC|\/assets\/orb\/orb-brand\.png/)
  })

  it('premium tokens removed launch dark lock', () => {
    const premium = readComponent('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.doesNotMatch(premium, /ORB Residential launch lock/)
    assert.doesNotMatch(premium, /color-scheme:\s*dark !important[\s\S]*orb-theme-light/)
    assert.match(premium, /\.orb-chat-layout--residential\.orb-theme-light/)
    assert.match(premium, /--orb-res-bg/)
  })

  it('mobile CSS uses theme-scoped workspace tokens not forced dark', () => {
    const mobileCss = readComponent('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(mobileCss, /orb-theme-light \[data-orb-starter-card\]/)
    assert.match(mobileCss, /orb-theme-dark \[data-orb-starter-card\]/)
    assert.match(mobileCss, /--orb-res-card/)
    assert.doesNotMatch(mobileCss, /always premium dark workspace \(launch lock\)/)
  })

  it('desktop CSS scopes residential dark overrides to orb-theme-dark', () => {
    const desktop = readComponent('app/orb/_legacy-ui-archive/orb-desktop.css')
    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-dark/)
    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-light/)
    assert.doesNotMatch(desktop, /^\.orb-chat-layout--residential,\s*\n\[data-orb-shell/m)
    assert.doesNotMatch(desktop, /shell\/layout dark authority/)
  })

  it('shell root prevents horizontal overflow on mobile', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    const mobileCss = readComponent('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(theme, /overflow-x-hidden/)
    assert.match(mobileCss, /overflow-x:\s*hidden/)
  })

  it('workspace panels use theme token variables', () => {
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const documents = readComponent('components/orb-standalone/orb-document-panel.tsx')
    const shift = readComponent('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    assert.match(frame, /--orb-mobile-ws-/)
    assert.match(billing, /orb-billing-card|--orb-mobile-ws/)
    assert.doesNotMatch(billing, /bg-white/)
    assert.match(saved, /orb-mobile-workspace-card|--orb-mobile-ws-text/)
    assert.match(documents, /orb-document-panel|--orb-mobile-ws|var\(--orb-/)
    assert.match(shift, /orbStationShellProps\(residentialSurface/)
  })

  it('billing and account modals avoid hardcoded white cards; settings uses readable slate copy', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const account = readComponent('components/orb-standalone/orb-account-modal.tsx')
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(settings, /data-orb-settings-appearance-lock-note/)
    for (const src of [account, billing]) {
      assert.doesNotMatch(src, /bg-white/)
      assert.doesNotMatch(src, /text-slate-/)
    }
  })
})
