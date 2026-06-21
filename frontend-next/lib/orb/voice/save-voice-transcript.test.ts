import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('save voice transcript to saved outputs', () => {
  it('save module uses voice provenance and brain metadata', () => {
    const save = readComponent('lib/orb/voice/save-voice-transcript.ts')
    const adapters = readComponent('lib/orb/orb-saved-output-adapters.ts')
    assert.match(save, /created_from: 'voice'/)
    assert.match(save, /source_feature: 'voice'/)
    assert.match(save, /buildVoiceSavedOutputBrainMetadata/)
    assert.match(save, /source_text/)
    assert.match(save, /voiceSummary/)
    assert.match(save, /buildSavedOutputCreateBody/)
    assert.match(adapters, /buildVoiceSavedOutputBrainMetadata/)
    assert.match(adapters, /feature: 'voice'/)
    assert.match(adapters, /os_records_accessed: false/)
    assert.match(adapters, /live_record_access: false/)
  })

  it('voice saved outputs expose unavailable re-run', () => {
    const adapters = readComponent('lib/orb/orb-saved-output-adapters.ts')
    assert.match(adapters, /kind: 'voice_transcript'/)
    assert.match(adapters, /sourceFeature === 'voice'/)
    assert.match(adapters, /available: false/)
    assert.match(adapters, /cannot be re-run/i)
  })

  it('voice station shows save and route actions when transcript exists', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-save-reflection/)
    assert.match(station, /createOrbSavedOutput/)
    assert.match(station, /data-orb-voice-send-to-dictate/)
    assert.match(station, /data-orb-voice-copy-summary/)
    assert.match(station, /data-orb-voice-open-write/)
  })

  it('saved output detail supports dictate, ask orb, shift builder and rerun notice', () => {
    const detail = readComponent('components/orb-standalone/orb-saved-output-detail-actions.tsx')
    assert.match(detail, /data-orb-saved-output-send-dictate/)
    assert.match(detail, /data-orb-saved-output-ask-orb/)
    assert.match(detail, /data-orb-saved-output-shift-builder/)
    assert.match(detail, /data-orb-saved-output-rerun-unavailable/)
  })

  it('launch controls delegate transcript actions', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-summary-actions/)
    assert.match(station, /data-orb-voice-send-to-dictate/)
    assert.match(station, /data-orb-voice-open-write/)
  })
})
