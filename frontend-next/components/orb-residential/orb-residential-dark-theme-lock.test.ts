import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential dark theme lock', () => {
  it('theme source exports residential dark resolver', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(theme, /ORB_RESIDENTIAL_RESOLVED_THEME[\s\S]*'dark'/)
    assert.match(theme, /resolveOrbResidentialTheme/)
  })

  it('OrbShell forces dark theme and CSS variables', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    assert.match(shell, /ORB_RESIDENTIAL_RESOLVED_THEME/)
    assert.match(shell, /data-orb-theme=\{ORB_RESIDENTIAL_RESOLVED_THEME\}/)
    assert.match(shell, /getOrbThemeCssVariables\(ORB_RESIDENTIAL_RESOLVED_THEME\)/)
    assert.match(shell, /orb-theme-dark/)
    assert.doesNotMatch(shell, /useOrbAppearance/)
    assert.doesNotMatch(shell, /resolvedTheme/)
  })

  it('residential theme lock applies dark document attributes', () => {
    const lock = readComponent('components/orb-residential/use-orb-residential-theme-lock.ts')
    assert.match(lock, /ORB_RESIDENTIAL_RESOLVED_THEME/)
    assert.match(lock, /applyOrbDocumentTheme/)
    assert.match(lock, /data-orb-theme/)
    assert.match(lock, /colorScheme/)
  })

  it('care companion forces dark when residentialSurface', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /residentialSurface \? 'dark' : resolvedTheme/)
    assert.match(companion, /data-orb-system-theme=\{effectiveTheme\}/)
  })

  it('/orb bootstrap always resolves to dark', () => {
    const appearance = readComponent('lib/orb/orb-appearance.ts')
    assert.match(appearance, /var theme='dark'/)
    assert.match(appearance, /data-orb-residential/)
    assert.doesNotMatch(appearance, /var theme='light';if\(mode==='dark'\)/)
  })

  it('light-layer-fix excludes residential layout', () => {
    const lightFix = readComponent('app/orb/orb-light-layer-fix.css')
    assert.match(lightFix, /:not\(\.orb-chat-layout--residential\)/)
    assert.doesNotMatch(lightFix, /html\[data-orb-residential='1'\]/)
    assert.doesNotMatch(lightFix, /\.orb-chat-layout--residential\.orb-theme-light/)
  })

  it('mobile CSS pins residential workspace to dark tokens', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(mobileCss, /\.orb-chat-layout--residential \.orb-main-workspace/)
    assert.match(mobileCss, /--orb-mobile-ws-panel/)
    assert.match(mobileCss, /\.orb-chat-layout--residential \[data-orb-billing-modal\] \.orb-billing-card/)
  })

  it('settings appearance shows dark locked for residential', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const control = readComponent('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(settings, /residentialSurface \? 'dark'/)
    assert.match(settings, /residentialLocked=\{residentialSurface\}/)
    assert.match(control, /residentialLocked/)
    assert.match(control, /disabled = residentialLocked && option.id !== 'dark'/)
  })

  it('billing modal uses dark workspace card classes not bg-white', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /orb-billing-card/)
    assert.match(billing, /orb-mobile-workspace-card/)
    assert.match(billing, /--orb-mobile-ws-card/)
    assert.doesNotMatch(billing, /bg-white/)
    assert.doesNotMatch(billing, /text-slate/)
  })

  it('saved outputs and documents use dark workspace tokens', () => {
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const documents = readComponent('components/orb-standalone/orb-document-panel.tsx')
    const shift = readComponent('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    assert.match(saved, /orb-mobile-workspace-card|--orb-mobile-ws-text/)
    assert.doesNotMatch(saved, /bg-white/)
    assert.doesNotMatch(documents, /bg-white|text-slate-/)
    assert.doesNotMatch(shift, /bg-white|text-slate-/)
  })

  it('shell root prevents horizontal overflow on mobile', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(theme, /overflow-x-hidden/)
    assert.match(mobileCss, /overflow-x:\s*hidden/)
  })
})
