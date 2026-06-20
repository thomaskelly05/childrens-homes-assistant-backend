import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate hero polish', () => {
  it('hero output types cover residential recording flow', () => {
    const heroTypes = readComponent('lib/orb/dictate/orb-dictate-hero-output-types.ts')
    const types = readComponent('lib/orb/dictate/orb-dictate-types.ts')
    assert.match(heroTypes, /convergedDictateHeroNoteTypes/)
    assert.match(heroTypes, /daily_record/)
    assert.match(heroTypes, /missing_episode_note/)
    assert.match(heroTypes, /manager_oversight_note/)
    assert.match(types, /ORB_DICTATE_NOTE_TYPE_LABELS/)
    assert.match(types, /daily_record: 'Daily log'/)
    assert.match(types, /missing_episode_note: 'Missing from home return'/)
  })

  it('local brain metadata matches standalone ORB Residential contract', () => {
    const metadata = readComponent('lib/orb/dictate/orb-dictate-brain-metadata.ts')
    assert.match(metadata, /assertDictateBrainMetadata/)
    assert.match(metadata, /buildLocalDictateBrainMetadata/)
    assert.match(metadata, /os_records_accessed: false/)
    assert.match(metadata, /live_record_access: false/)
  })

  it('station shows Dictate title, subtitle, transcript and brain panels', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const types = readComponent('lib/orb/dictate/orb-dictate-types.ts')
    assert.match(types, /orbResidentialStation\('orb_dictate'\)/)
    assert.match(types, /ORB_DICTATE_PRODUCT_SUBTITLE/)
    assert.match(topBar, /data-orb-dictate-title/)
    assert.match(station, /data-orb-dictate-subtitle/)
    assert.match(workspace, /OrbDictateReviewChecklist/)
    assert.match(workspace, /OrbDictateBrainPanel/)
    assert.match(topBar, /OrbDictateTemplateSelector/)
  })

  it('boundary copy is visible in UI', () => {
    const boundary = readComponent('components/orb-standalone/orb-dictate-boundary-copy.tsx')
    const types = readComponent('lib/orb/dictate/orb-dictate-types.ts')
    assert.match(boundary, /data-orb-dictate-boundary-based-on-input/)
    assert.match(types, /ORB_DICTATE_GOVERNANCE_COPY/)
    assert.match(types, /Based only on what you provide/)
    assert.match(types, /ORB does not access live care records in standalone mode/)
  })

  it('copy save export and finalise actions are present', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const toolbar = readComponent('components/orb-write/orb-write-toolbar.tsx')
    assert.match(topBar, /data-orb-dictate-generate/)
    assert.match(topBar, /data-orb-dictate-finalise/)
    assert.match(toolbar, /data-orb-write-copy/)
    assert.match(toolbar, /data-orb-write-save-draft|data-orb-write-export-pdf/)
  })

  it('sidebar nav uses Dictate label without helper clutter', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.match(sidebar, /orb_dictate/)
    assert.match(sidebar, /Dictate/)
    assert.doesNotMatch(sidebar, /label: 'Magic Notes'/)
  })
})
