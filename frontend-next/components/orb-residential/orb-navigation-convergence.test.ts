import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VISIBLE_SIDEBAR_NAV_IDS,
  isDeprecatedPrimaryNavPanel,
  resolveConvergedNavigation
} from '../../lib/orb/orb-navigation-convergence.ts'
import { ORB_NAV_RECORDS, ORB_VISIBLE_SIDEBAR_NAV } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB navigation convergence', () => {
  it('visible sidebar nav includes Home through Settings', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const names = readComponent('lib/orb/orb-user-facing-names.ts')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.match(sidebar, /RESIDENTIAL_VISIBLE_NAV/)
    for (const id of ORB_VISIBLE_SIDEBAR_NAV_IDS) {
      assert.match(names, new RegExp(`id: '${id}'`))
    }
  })

  it('communicate is hidden from launch nav but remains routable', () => {
    const names = readComponent('lib/orb/orb-user-facing-names.ts')
    assert.match(names, /ORB_HIDDEN_LAUNCH_STATION_IDS/)
    assert.doesNotMatch(names, /id: 'orb_communicate'[\s\S]*ORB_VISIBLE_SIDEBAR_NAV/)
  })

  it('primary sidebar does not render Shift Builder, Review, Skills, Library or Magic Notes', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const visibleNav = sidebar.slice(
      sidebar.indexOf('const RESIDENTIAL_VISIBLE_NAV'),
      sidebar.indexOf('export type OrbResidentialStationId')
    )
    assert.doesNotMatch(sidebar, /DESKTOP_LIBRARY_NAV/)
    assert.doesNotMatch(sidebar, /MOBILE_DRAWER_QUICK_NAV/)
    assert.doesNotMatch(visibleNav, /label: 'Shift Builder'/)
    assert.doesNotMatch(visibleNav, /label: 'Review'/)
    assert.doesNotMatch(visibleNav, /label: 'Skills'/)
    assert.doesNotMatch(visibleNav, /label: 'Templates'/)
    assert.doesNotMatch(visibleNav, /label: 'Documents & Guidance'/)
    assert.doesNotMatch(visibleNav, /Magic Notes/)
    assert.doesNotMatch(visibleNav, /Saved Outputs/)
    assert.match(sidebar, /ORB_NAV_RECORDS/)
  })

  it('deprecated panel ids resolve to converged destinations', () => {
    assert.equal(resolveConvergedNavigation('shift_builder').destination.kind, 'chat')
    assert.equal(resolveConvergedNavigation('review').destination.station, 'orb_write')
    assert.equal(resolveConvergedNavigation('inspection_readiness').destination.kind, 'chat')
    assert.equal(resolveConvergedNavigation('safeguarding_thinking').destination.kind, 'chat')
    assert.equal(resolveConvergedNavigation('record_properly').destination.kind, 'chat')
    assert.equal(resolveConvergedNavigation('knowledge').destination.kind, 'chat')
  })

  it('marks deprecated primary nav panels', () => {
    for (const id of [
      'shift_builder',
      'review',
      'inspection_readiness',
      'safeguarding_thinking',
      'record_properly',
      'knowledge'
    ]) {
      assert.equal(isDeprecatedPrimaryNavPanel(id), true)
    }
    assert.equal(isDeprecatedPrimaryNavPanel('orb_dictate'), false)
  })

  it('chat starters include converged workflows', () => {
    const registry = readComponent('lib/orb/orb-converged-actions.ts')
    assert.match(registry, /Create handover \/ shift plan/)
    assert.match(registry, /Review written practice/)
    assert.match(registry, /Think through safeguarding concern/)
    assert.match(registry, /Prepare for inspection/)
    assert.match(registry, /Help me record this properly/)
    assert.match(registry, /Create manager summary/)
    assert.match(registry, /Build action plan from Reg 44/)
    assert.match(registry, /Summarise recent changes/)
    assert.match(registry, /Turn policy into easy-read briefing/)
  })

  it('companion wires converged redirect card', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbConvergedPanelRedirect/)
    assert.match(companion, /applyConvergenceRoute/)
    assert.match(companion, /data-orb-convergence-notice/)
  })
})
