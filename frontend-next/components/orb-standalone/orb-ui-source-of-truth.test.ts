import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB UI source of truth — overlays and responsive branches', () => {
  it('Voice uses runtime responsive branch — not simultaneous mobile and desktop controls', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbResponsiveMode/)
    assert.match(station, /isMobileViewport \?/)
    assert.doesNotMatch(station, /md:hidden[\s\S]*OrbVoiceMobileExperience[\s\S]*hidden flex-col items-center p-6 pb-8 md:flex/)
    assert.match(station, /data-orb-mobile-branch="active"/)
    assert.match(station, /data-orb-desktop-branch="active"/)
    assert.match(station, /OrbAppModal/)
  })

  it('Voice actions expose single primary surface and start marker', () => {
    const actions = read('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /data-orb-voice-action-surface="primary"/)
    assert.match(actions, /data-orb-voice-primary-action=\{isStartVoice \? 'start'/)
    const mobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.doesNotMatch(mobile, /md:hidden/)
  })

  it('OrbAppPanelShell splits backdrop below content with audit markers', () => {
    const shell = read('components/orb-standalone/orb-app-panel-shell.tsx')
    assert.match(shell, /data-orb-app-panel-backdrop/)
    assert.match(shell, /data-orb-app-panel-active="true"/)
    assert.match(shell, /pointer-events-none/)
    assert.match(shell, /data-orb-app-panel-backdrop[\s\S]*pointer-events-auto/)
    assert.match(shell, /data-orb-app-panel-content/)
  })

  it('legacy panel shell delegates to OrbAppPanelShell', () => {
    const legacy = read('components/orb-standalone/orb-standalone-panel-shell.tsx')
    assert.match(legacy, /OrbAppPanelShell/)
    assert.doesNotMatch(legacy, /orb-panel-overlay fixed inset-0/)
  })

  it('Dictate station uses runtime mobile/desktop branches', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /useOrbMobileViewport|useOrbResponsiveMode/)
    assert.match(dictate, /data-orb-mobile-branch="active"/)
    assert.match(dictate, /data-orb-desktop-branch="active"/)
  })

  it('main composer marker is singular; footer only on non-residential composer', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-composer="main"/)
    const footer = read('components/orb-standalone/orb-footer.tsx')
    assert.match(footer, /data-orb-footer="main"/)
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /!compactResidential \?[\s\S]*OrbFooter/)
    assert.doesNotMatch(composer, /data-orb-composer[\s\n]/)
  })

  it('desktop CSS does not duplicate copyright via disclaimer ::after', () => {
    const css = read('app/orb/orb-desktop.css')
    assert.doesNotMatch(css, /\[data-orb-composer-disclaimer\]::after[\s\S]*ORB Residential · ©/)
  })

  it('account panel uses activePanel account source of truth', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /activePanel === 'account'/)
    assert.doesNotMatch(companion, /accountModalOpen/)
    const types = read('components/orb-standalone/orb-standalone-panel-types.ts')
    assert.match(types, /'account'/)
  })

  it('ORB_UI_AUDIT helpers exist for debug mode', () => {
    const audit = read('components/orb-standalone/orb-ui-audit.ts')
    assert.ok(audit.length > 100)
    assert.match(audit, /runOrbUiAudit/)
    assert.match(audit, /runOrbUiHitTest/)
    assert.match(audit, /runOrbUiDuplicates/)
    assert.match(audit, /registerOrbUiAuditGlobals/)
    const bootstrap = read('components/orb-standalone/orb-ui-audit-bootstrap.tsx')
    assert.match(bootstrap, /registerOrbUiAuditGlobals/)
    assert.match(bootstrap, /OrbUiAuditBootstrap/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbUiAuditBootstrap/)
  })

  it('flight recorder minimised state does not block pointer events on panel CTAs', () => {
    const recorder = read('components/orb-standalone/orb-client-flight-recorder.tsx')
    assert.match(recorder, /collapsed \? 'pointer-events-none'/)
    assert.match(recorder, /pointer-events-auto/)
  })

  it('useOrbResponsiveMode is shared hook with mode markers', () => {
    const hook = read('components/orb-standalone/use-orb-responsive-mode.ts')
    assert.match(hook, /OrbResponsiveMode/)
    assert.match(hook, /mode: isMobile \? 'mobile' : 'desktop'/)
    assert.match(hook, /isTablet/)
  })

  it('appearance defaults to system on html dataset', () => {
    const appearance = read('lib/orb/orb-appearance.ts')
    assert.match(appearance, /data-orb-appearance/)
    assert.match(appearance, /'system'/)
    assert.match(appearance, /ORB_APPEARANCE_BOOTSTRAP_SCRIPT/)
  })
})
