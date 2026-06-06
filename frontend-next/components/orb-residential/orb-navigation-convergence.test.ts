import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VISIBLE_LIBRARY_NAV_IDS,
  ORB_VISIBLE_MAIN_NAV_IDS,
  isDeprecatedPrimaryNavPanel,
  resolveConvergedNavigation
} from '../../lib/orb/orb-navigation-convergence.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB navigation convergence', () => {
  it('visible main nav includes Chat, Dictate, Voice and ORB Write', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    for (const id of ORB_VISIBLE_MAIN_NAV_IDS) {
      if (id === 'chat') {
        assert.match(sidebar, /label: 'Chat'/)
        continue
      }
      assert.match(sidebar, new RegExp(`id: '${id}'`))
    }
  })

  it('visible library nav includes Templates, Documents and Saved Outputs', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    for (const id of ORB_VISIBLE_LIBRARY_NAV_IDS) {
      assert.match(sidebar, new RegExp(`id: '${id}'`))
    }
  })

  it('primary sidebar does not render Shift Builder, Review, Practice or Knowledge Library', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const mainNav = sidebar.slice(
      sidebar.indexOf('const DESKTOP_MAIN_NAV'),
      sidebar.indexOf('const DESKTOP_LIBRARY_NAV')
    )
    const libraryNav = sidebar.slice(
      sidebar.indexOf('const DESKTOP_LIBRARY_NAV'),
      sidebar.indexOf('const COLLAPSED_RAIL_STATIONS')
    )
    const mobileNav = sidebar.slice(
      sidebar.indexOf('const MOBILE_DRAWER_QUICK_NAV'),
      sidebar.indexOf('export type OrbResidentialStationId')
    )
    assert.doesNotMatch(sidebar, /DESKTOP_PRACTICE_NAV/)
    for (const block of [mainNav, libraryNav, mobileNav]) {
      assert.doesNotMatch(block, /label: 'Shift Builder'/)
      assert.doesNotMatch(block, /label: 'Review'/)
      assert.doesNotMatch(block, /label: 'Knowledge Library'/)
      assert.doesNotMatch(block, /Safeguarding Thinking/)
      assert.doesNotMatch(block, /Record This Properly/)
      assert.doesNotMatch(block, /Inspection Readiness/)
    }
  })

  it('deprecated panel ids resolve to converged destinations', () => {
    assert.equal(resolveConvergedNavigation('shift_builder').destination.kind, 'station')
    assert.equal(resolveConvergedNavigation('shift_builder').destination.station, 'templates')
    assert.equal(resolveConvergedNavigation('review').destination.station, 'orb_write')
    assert.equal(resolveConvergedNavigation('inspection_readiness').destination.station, 'documents')
    assert.equal(resolveConvergedNavigation('safeguarding_thinking').destination.kind, 'chat')
    assert.equal(resolveConvergedNavigation('record_properly').destination.station, 'orb_dictate')
    assert.equal(resolveConvergedNavigation('knowledge').destination.station, 'documents')
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
    assert.match(registry, /Record this properly/)
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
