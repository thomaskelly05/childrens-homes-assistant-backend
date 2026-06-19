import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_LABEL,
  ORB_GUIDED_DEMO_SAFETY_NOTE
} from '../../lib/orb/orb-guided-demo.ts'
import {
  ORB_CHAT_EMPTY_SUBLINE,
  ORB_NAV_RECORDS,
  ORB_REQUEST_DEMO_LABEL,
  ORB_REQUEST_DEMO_URL
} from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const USER_FACING_SCAN_DIRS = [
  'components/orb-residential',
  'components/orb-standalone',
  'components/orb-write',
  'lib/orb'
] as const

const DEPRECATED_VISIBLE_LABELS = [
  'Magic Notes',
  'Saved Outputs',
  'Export coming soon',
  'Shift Builder',
  'Skills'
] as const

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      walkSourceFiles(full, acc)
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !/\.test\.(tsx?|ts)$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

describe('ORB Residential Phase 1B guided demo', () => {
  it('home empty state exposes single Guided Demo entry', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    assert.match(companion, /OrbGuidedDemoEntry/)
    assert.match(entry, /data-orb-guided-demo-entry/)
    assert.match(entry, /data-orb-guided-demo-start/)
    assert.match(entry, new RegExp(ORB_GUIDED_DEMO_LABEL))
  })

  it('guided demo panel renders steps in order with safety note', () => {
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    assert.match(panel, /ORB_GUIDED_DEMO_STEPS/)
    assert.match(panel, /data-orb-guided-demo-step-index/)
    assert.match(panel, /data-orb-guided-demo-safety-note/)
    assert.match(panel, /ORB_GUIDED_DEMO_SAFETY_NOTE/)
    assert.match(panel, /data-orb-guided-demo-scenario-summary/)
  })

  it('companion wires guided demo state, panel and deep link', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbGuidedDemoPanel/)
    assert.match(companion, /startOrbGuidedDemo/)
    assert.match(companion, /guided_demo/)
    assert.match(companion, /orbGuidedDemoChatPrompt/)
    assert.match(companion, /orbGuidedDemoDictateNotes/)
    assert.match(companion, /orbGuidedDemoWriteSeed/)
    assert.match(companion, /orbGuidedDemoSaveTitle/)
  })

  it('home value proposition uses child-centred copy', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(names, /ORB_HOME_VALUE_PROPOSITION/)
    assert.match(ORB_CHAT_EMPTY_SUBLINE, /child\u2019s experience central/)
    assert.match(copy, /ORB_CHAT_EMPTY_SUBLINE/)
  })

  it('request demo CTA uses one label and URL on intended surfaces', () => {
    const link = read('components/orb-residential/orb-request-demo-link.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    const panel = read('components/orb-residential/orb-guided-demo-panel.tsx')
    const login = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')

    for (const source of [entry, panel, login, upgrade]) {
      assert.match(source, /OrbRequestDemoLink/)
    }
    assert.match(link, /ORB_REQUEST_DEMO_LABEL/)
    assert.match(link, /ORB_REQUEST_DEMO_URL/)
    assert.match(entry, /data-orb-request-demo-surface="home"|surface="home"/)
    assert.match(panel, /surface="guided_demo"/)
    assert.match(login, /surface="login"/)
    assert.match(upgrade, /data-orb-upgrade-request-demo/)
    assert.match(upgrade, /surface="upgrade"/)
  })

  it('Records & Drafts remains the saved-work label', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    assert.match(names, /ORB_NAV_RECORDS = 'Records & Drafts'/)
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('does not reintroduce deprecated visible product labels in primary UI sources', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const visibleNav = sidebar.slice(
      sidebar.indexOf('const RESIDENTIAL_VISIBLE_NAV'),
      sidebar.indexOf('export type OrbResidentialStationId')
    )
    for (const label of DEPRECATED_VISIBLE_LABELS) {
      assert.doesNotMatch(visibleNav, new RegExp(label))
    }
    assert.doesNotMatch(read('components/orb-residential/orb-guided-demo-entry.tsx'), /Magic Notes|Saved Outputs/)
  })

  it('user-facing scan finds no competing demo or contact URLs', () => {
    const files: string[] = []
    for (const dir of USER_FACING_SCAN_DIRS) {
      walkSourceFiles(join(root, dir), files)
    }
    const demoUrlMatches: string[] = []
    const contactUrlMatches: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (source.includes('indicare.co.uk/contact') && !source.includes('ORB_REQUEST_DEMO_URL')) {
        contactUrlMatches.push(file.replace(`${root}/`, ''))
      }
      if (/guided demo/i.test(source) && !source.includes('orb-guided-demo') && !source.includes('OrbGuidedDemo')) {
        demoUrlMatches.push(file.replace(`${root}/`, ''))
      }
    }
    assert.deepEqual(
      contactUrlMatches,
      [],
      `raw contact URLs outside ORB_REQUEST_DEMO_URL: ${contactUrlMatches.join(', ')}`
    )
  })
})

describe('ORB Residential Phase 1B.1 language alignment', () => {
  it('upgrade and login surfaces use demo-before-trial copy with single CTA', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    const login = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(upgrade, /ORB_DEMO_BEFORE_TRIAL_COPY/)
    assert.match(upgrade, /ORB_UPGRADE_INCLUDES_COPY/)
    assert.match(upgrade, /ORB_UPGRADE_DEFAULT_FEATURES/)
    assert.doesNotMatch(upgrade, /saved outputs/)
    assert.doesNotMatch(upgrade, /Shift Builder/)
    assert.match(login, /ORB_DEMO_BEFORE_TRIAL_COPY/)
    assert.match(login, /data-orb-login-demo-path/)
  })

  it('demo save prefix is wired through write and dictate save flows', () => {
    const writePanel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const writeStation = read('components/orb-write/orb-write-station.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    const handoff = read('lib/orb/write/orb-write-content-handoff.ts')
    for (const source of [writePanel, writeStation, dictate, handoff]) {
      assert.match(source, /resolveOrbGuidedDemoSaveTitle/)
    }
    for (const source of [writePanel, writeStation, dictate]) {
      assert.match(source, /orbGuidedDemoSaveStatusMessage/)
    }
  })

  it('legacy shell and search registry use Phase 1A records language', () => {
    const shell = read('components/orb-residential/orb-residential-shell.tsx')
    const search = read('lib/orb/orb-search-registry.ts')
    assert.match(shell, /ORB_NAV_RECORDS/)
    assert.doesNotMatch(shell, /Shift Builder/)
    assert.match(search, /ORB_RECORDS_SEARCH_LABEL/)
    assert.doesNotMatch(search, /Search saved outputs/)
  })

  it('residential home promotes Dictate and Guided Demo instead of Shift Builder', () => {
    const home = read('components/orb-residential/orb-residential-home.tsx')
    assert.match(home, /Dictate/)
    assert.match(home, /guided_demo=1/)
    assert.doesNotMatch(home, /Shift Builder/)
    assert.doesNotMatch(home, /Build a shift pack/)
  })
})
