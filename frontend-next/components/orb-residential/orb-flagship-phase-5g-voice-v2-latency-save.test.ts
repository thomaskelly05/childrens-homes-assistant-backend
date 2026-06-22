import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5G Voice v2 latency and save reflection', () => {
  it('latency and tiny-turn regressions remain', () => {
    const guard = read('lib/orb/voice-v2/orb-voice-v2-turn-guard.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(guard, /isOrbVoiceV2TurnSubstantial/)
    assert.match(hook, /traceOrbVoiceV2IgnoredTinyTurn/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Save to Records & Drafts action exists', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    assert.match(station, /ORB_VOICE_V2_SAVE_TO_RECORDS/)
    assert.match(station, /data-orb-voice-save-records-drafts/)
    assert.match(copy, /Save to Records & Drafts/)
  })

  it('Save payload includes reflection packet in extras/metadata', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /buildSavedOutputCreateBody/)
    assert.match(station, /voice_reflection_packet/)
    assert.match(station, /adult_review_status: 'generated_for_adult_review'/)
    assert.match(station, /created_from: 'orb_voice_v2'/)
  })

  it('Copy fallback exists if save fails', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    assert.match(station, /ORB_VOICE_V2_SAVE_FAILED/)
    assert.match(copy, /Could not save the reflection\. You can copy it instead\./)
    assert.match(station, /data-orb-voice-copy-summary/)
  })

  it('Send to Dictate and Open in ORB Write still receive packet content', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-send-to-dictate/)
    assert.match(station, /data-orb-voice-open-write/)
    assert.match(station, /onOpenDictate\(voice\.summary/)
    assert.match(station, /onOpenWrite\(voice\.summary/)
  })

  it('structured summary UI shows review sections', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SUMMARY_TITLE/)
    assert.match(station, /ORB_VOICE_V2_SUMMARY_REVIEW_NOTE/)
    assert.match(station, /data-orb-voice-summary-sections/)
    assert.match(station, /What may need recording/)
    assert.match(station, /Follow-up \/ oversight/)
  })

  it('No legacy Voice imports in active station', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /use-standalone-orb-voice/)
    assert.doesNotMatch(station, /orb-voice-session/)
  })

  it('One shell CSS import remains true', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(layout, /orb-flagship|orb-showstopper|orb-voice-companion\.css/)
  })

  it('Voice v2 routes remain active', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const routes = read('../routers/orb_voice_v2_routes.py')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(routes, /\/transcribe|transcribe/)
    assert.match(routes, /\/respond|respond/)
    assert.match(routes, /\/speak|speak/)
    assert.match(routes, /\/status|status/)
  })

  it('Katherine ElevenLabs path remains active', () => {
    const service = read('../services/orb_voice_v2_service.py')
    const routes = read('../routers/orb_voice_v2_routes.py')
    assert.match(service, /katherine|Katherine/i)
    assert.match(routes, /elevenlabs|Katherine/i)
  })

  it('No compliance guarantee language in Voice copy', () => {
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(copy, /compliance guarantee|final record|approved record/i)
    assert.doesNotMatch(station, /compliance guarantee|final record|approved record/i)
    assert.match(copy, /not yet a record|Review this before saving/)
  })

  it('Phase 5F microphone transition regressions remain', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /MICROPHONE_REQUEST_TIMEOUT_MS/)
    assert.match(hook, /onListeningReady/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5d-voice-v2-clickable-idle/)
  })
})
