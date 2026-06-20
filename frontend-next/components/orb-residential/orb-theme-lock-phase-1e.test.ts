import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_ACTIVE_MARKER
} from '../../lib/orb/orb-showstopper-copy.ts'
import {
  ORB_HOME_RAIL_TRUST_ITEMS,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '../../lib/orb/orb-convergence-phase-1h-copy.ts'
import {
  ORB_NAV_RECORDS
} from '../../lib/orb/orb-user-facing-names.ts'
import {
  ORB_RESIDENTIAL_LOCKED_THEME,
  ORB_RESIDENTIAL_THEME_LOCK_COPY,
  ORB_APPEARANCE_BOOTSTRAP_SCRIPT,
  readOrbAppearanceMode,
  resolveOrbResidentialTheme
} from '../../lib/orb/orb-appearance.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 1E theme lock', () => {
  it('residential appearance always resolves to locked light theme', () => {
    assert.equal(resolveOrbResidentialTheme('dark'), 'light')
    assert.equal(resolveOrbResidentialTheme('system'), 'light')
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
    assert.match(ORB_RESIDENTIAL_THEME_LOCK_COPY, /fixed light interface/)
  })

  it('bootstrap script forces light theme for residential', () => {
    assert.match(ORB_APPEARANCE_BOOTSTRAP_SCRIPT, /data-orb-theme-locked/)
    assert.match(ORB_APPEARANCE_BOOTSTRAP_SCRIPT, /localStorage\.setItem\(K,LOCK\)/)
    assert.doesNotMatch(ORB_APPEARANCE_BOOTSTRAP_SCRIPT, /timeTheme\(\)/)
  })

  it('appearance provider and hook expose residential theme lock', () => {
    const provider = read('components/orb-standalone/orb-appearance-provider.tsx')
    const hook = read('components/orb-standalone/use-orb-appearance.ts')
    const theme = read('lib/orb/orb-residential-theme.ts')
    assert.match(provider, /residentialThemeLocked/)
    assert.match(provider, /resolveOrbResidentialTheme/)
    assert.match(hook, /residentialThemeLocked/)
    assert.match(hook, /resolveOrbResidentialTheme/)
    assert.match(theme, /resolveOrbResidentialTheme/)
    assert.match(theme, /orbThemeLocked/)
  })

  it('settings appearance control is locked on residential surface', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const control = read('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(settings, /residentialLocked=\{residentialSurface\}/)
    assert.match(settings, /data-orb-settings-appearance-lock-note/)
    assert.match(control, /data-orb-appearance-locked/)
    assert.match(control, /data-orb-appearance-lock-copy/)
    assert.match(control, /disabled=\{residentialLocked/)
  })

  it('care companion forces light theme on residential surface', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /const effectiveTheme = residentialSurface \? 'light' : resolvedTheme/)
    assert.match(companion, /data-orb-guided-demo-active-marker/)
    assert.equal(ORB_GUIDED_DEMO_ACTIVE_MARKER, 'Guided Demo \u00b7 anonymised scenario')
  })

  it('theme lock stylesheet is wired and defines readable tokens', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-theme-lock-phase-1e\.css/)
    assert.match(css, /--orb-read-text-primary/)
    assert.match(css, /data-orb-residential='1'/)
    assert.match(css, /data-orb-voice-status/)
  })

  it('login headline and trust rail remain readable', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_TITLE/)
    assert.equal(ORB_LOGIN_ENTERPRISE_TITLE, 'ORB Residential')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
  })

  it('guided demo safety note and modal classes remain present', () => {
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    assert.match(panel, /ORB_GUIDED_DEMO_SAFETY_NOTE/)
    assert.match(panel, /orb-guided-demo-panel__safety/)
    assert.match(panel, /text-slate-/)
  })

  it('help settings billing modals use readable panel hooks', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(help, /data-orb-help-panel|OrbStandalonePanelShell/)
    assert.match(settings, /data-orb-settings-panel/)
    assert.match(billing, /data-orb-billing-modal|orb-billing-card/)
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

  it('readOrbAppearanceMode returns light for residential routes', () => {
    const bag: Record<string, string> = {}
    const mockStorage = {
      getItem: (key: string) => bag[key] ?? null,
      setItem: (key: string, value: string) => {
        bag[key] = value
      }
    }
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true })
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
    try {
      bag['orb-appearance-mode'] = 'dark'
      assert.equal(readOrbAppearanceMode({ residential: true }), 'light')
      bag['orb-appearance-mode'] = 'system'
      assert.equal(readOrbAppearanceMode({ residential: true }), 'light')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })
})
