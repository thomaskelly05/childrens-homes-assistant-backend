import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  assertDictateBrainMetadata,
  buildLocalDictateBrainMetadata
} from './orb-dictate-brain-metadata.ts'
import { ORB_DICTATE_HERO_OUTPUT_TYPES } from './orb-dictate-hero-output-types.ts'
import {
  ORB_DICTATE_GOVERNANCE_COPY,
  ORB_DICTATE_NOTE_TYPE_LABELS,
  ORB_DICTATE_PRODUCT_SUBTITLE,
  ORB_DICTATE_PRODUCT_TITLE
} from './orb-dictate-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate hero polish', () => {
  it('hero output types cover residential recording flow', () => {
    assert.equal(ORB_DICTATE_HERO_OUTPUT_TYPES.length, 9)
    assert.ok(ORB_DICTATE_HERO_OUTPUT_TYPES.includes('daily_record'))
    assert.ok(ORB_DICTATE_HERO_OUTPUT_TYPES.includes('missing_episode_note'))
    assert.ok(ORB_DICTATE_HERO_OUTPUT_TYPES.includes('manager_oversight_note'))
    assert.equal(ORB_DICTATE_NOTE_TYPE_LABELS.daily_record, 'Daily log')
    assert.equal(ORB_DICTATE_NOTE_TYPE_LABELS.missing_episode_note, 'Missing from home return')
  })

  it('local brain metadata matches standalone ORB Residential contract', () => {
    const meta = buildLocalDictateBrainMetadata('incident_record')
    assert.ok(assertDictateBrainMetadata(meta))
    assert.equal(meta.output_type, 'incident_record')
    assert.equal(meta.os_records_accessed, false)
    assert.equal(meta.live_record_access, false)
  })

  it('station shows Dictate title, subtitle, transcript and brain panels', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.equal(ORB_DICTATE_PRODUCT_TITLE, 'Dictate')
    assert.match(ORB_DICTATE_PRODUCT_SUBTITLE, /professional residential records/)
    assert.match(topBar, /data-orb-dictate-title/)
    assert.match(station, /data-orb-dictate-subtitle/)
    assert.match(workspace, /OrbTranscriptPanel/)
    assert.match(workspace, /OrbDictateBrainPanel/)
    assert.match(topBar, /OrbDictateTemplateSelector/)
  })

  it('boundary copy is visible in UI', () => {
    const boundary = readComponent('components/orb-standalone/orb-dictate-boundary-copy.tsx')
    assert.match(boundary, /data-orb-dictate-boundary-based-on-input/)
    assert.equal(ORB_DICTATE_GOVERNANCE_COPY.basedOnInput, 'Based only on what you provide.')
    assert.equal(ORB_DICTATE_GOVERNANCE_COPY.noLiveRecords, 'ORB does not access live care records in standalone mode.')
  })

  it('copy save export and finalise actions are present', () => {
    const topBar = readComponent('components/orb/dictate/OrbDictateTopBar.tsx')
    const write = readComponent('components/orb-write/orb-write-station.tsx')
    assert.match(topBar, /data-orb-dictate-generate/)
    assert.match(topBar, /data-orb-dictate-finalise/)
    assert.match(write, /data-orb-write-copy/)
    assert.match(write, /data-orb-write-save-draft/)
    assert.match(write, /data-orb-write-export-pdf/)
  })

  it('sidebar nav uses Dictate label with helper text', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /label: 'Dictate', helper: 'Rough notes to records'/)
    assert.doesNotMatch(sidebar, /label: 'Magic Notes'/)
  })
})
