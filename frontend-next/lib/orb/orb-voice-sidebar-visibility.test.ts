import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_VISIBLE_SIDEBAR_NAV } from './orb-user-facing-names.ts'
import {
  buildOrbResidentialVisibleSidebarNav,
  getOrbResidentialVisibleSidebarNav,
  isOrbVoiceSidebarVisible,
  ORB_NAV_VOICE_ACCESSIBLE_LABEL,
  ORB_NAV_VOICE_BETA_BADGE
} from './orb-voice-sidebar-visibility.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice residential sidebar visibility', () => {
  it('keeps Voice in canonical sidebar nav list', () => {
    assert.ok(ORB_VISIBLE_SIDEBAR_NAV.some((entry) => entry.id === 'orb_voice'))
  })

  it('shows Voice in residential sidebar by default', () => {
    const prev = process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
    try {
      delete process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
      assert.equal(isOrbVoiceSidebarVisible(), true)
      assert.ok(getOrbResidentialVisibleSidebarNav().some((entry) => entry.id === 'orb_voice'))
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
      else process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE = prev
    }
  })

  it('hides Voice from residential sidebar when NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE=0', () => {
    const prev = process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
    try {
      process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE = '0'
      assert.equal(isOrbVoiceSidebarVisible(), false)
      assert.doesNotMatch(
        getOrbResidentialVisibleSidebarNav().map((entry) => entry.id).join(','),
        /orb_voice/
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
      else process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE = prev
    }
  })

  it('marks Voice with Beta badge and accessible label', () => {
    const prev = process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
    try {
      delete process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
      const voice = buildOrbResidentialVisibleSidebarNav().find((entry) => entry.id === 'orb_voice')
      assert.ok(voice)
      assert.equal(voice.badge, ORB_NAV_VOICE_BETA_BADGE)
      assert.equal(voice.accessibleLabel, ORB_NAV_VOICE_ACCESSIBLE_LABEL)
      assert.equal(voice.accessibleLabel, 'Voice (Beta)')
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE
      else process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE = prev
    }
  })

  it('residential sidebar uses filtered visible nav helper', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const visibility = read('lib/orb/orb-voice-sidebar-visibility.ts')
    assert.match(sidebar, /buildOrbResidentialVisibleSidebarNav/)
    assert.match(sidebar, /accessibleLabel/)
    assert.match(sidebar, /OrbSidebarNavBadge/)
    assert.match(visibility, /ORB_NAV_VOICE_BETA_BADGE/)
    assert.equal(ORB_NAV_VOICE_BETA_BADGE, 'Beta')
  })

  it('deep link routing for orb_voice remains in companion', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /stationParam === 'voice'/)
    assert.match(companion, /'orb_voice'/)
  })
})
