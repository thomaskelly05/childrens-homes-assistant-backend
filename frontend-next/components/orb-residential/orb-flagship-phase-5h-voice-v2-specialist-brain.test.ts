import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5H Voice v2 specialist brain', () => {
  it('specialist brain routing and session memory remain', () => {
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5m-voice-realtime-env-convergence|phase-5m-voice-realtime-env-convergence/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice brain router and protocol services exist', () => {
    assert.match(read('../services/orb_voice_brain_router_service.py'), /classify_voice_intent/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_fast|voice_specialist|voice_safeguarding/)
    assert.match(read('../services/orb_voice_protocol_service.py'), /bullying_or_peer_conflict/)
    assert.match(read('../services/orb_voice_respond_service.py'), /classify_voice_intent/)
    assert.match(read('../services/orb_voice_respond_service.py'), /orb_brain_convergence_orchestrator_service/)
  })

  it('Voice v2 still uses v2 routes only', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /use-standalone-orb-voice/)
  })

  it('respond client passes session memory and parses intent', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(client, /sessionMemory/)
    assert.match(client, /intent/)
    assert.match(client, /brainTier/)
    assert.match(hook, /setSessionMemory/)
    assert.match(hook, /setLastIntent/)
  })

  it('summary uses specialist reflection packet sections', () => {
    const reflection = read('lib/orb/voice-v2/orb-voice-v2-reflection.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(reflection, /youngPeopleInvolved/)
    assert.match(reflection, /observedOrReported/)
    assert.match(reflection, /bullying_or_peer_conflict/)
    assert.match(station, /data-orb-voice-summary-sections/)
    assert.match(station, /Young people involved/)
    assert.match(station, /What was observed or reported/)
  })

  it('Save to Records & Drafts still works', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SAVE_TO_RECORDS/)
    assert.match(station, /buildSavedOutputCreateBody/)
    assert.match(station, /data-orb-voice-save-records-drafts/)
  })

  it('one shell CSS import remains true', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
  })

  it('no compliance guarantee language in voice copy', () => {
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    assert.doesNotMatch(copy, /compliance guarantee|final record|ofsted approved/i)
  })

  it('Phase 5G latency regressions remain', () => {
    const guard = read('lib/orb/voice-v2/orb-voice-v2-turn-guard.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(guard, /isOrbVoiceV2TurnSubstantial/)
    assert.match(hook, /ORB_VOICE_V2_PREPARING_VOICE/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5d-voice-v2-clickable-idle/)
  })

  it('Katherine ElevenLabs path remains active', () => {
    assert.match(read('../services/orb_voice_v2_service.py'), /katherine/i)
    assert.match(read('../routers/orb_voice_v2_routes.py'), /\/speak/)
  })
})
