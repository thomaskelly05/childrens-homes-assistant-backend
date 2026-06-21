import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_VOICE_V2_ADULT_REVIEW_LABEL,
  ORB_VOICE_V2_MODES,
  ORB_VOICE_V2_MODE_PROMPT,
  ORB_VOICE_V2_SAFETY_FOOTER,
  ORB_VOICE_V2_TRANSCRIPT_LABEL,
  ORB_VOICE_V2_TRANSCRIPT_NOTE
} from '../../lib/orb/voice-v2/orb-voice-v2-copy.ts'
import { orbVoiceV2PrimaryLabel } from '../../lib/orb/voice-v2/orb-voice-v2-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4A Voice reflective companion', () => {
  it('build version marker is phase-5c-voice-v2-audio-playback-unlock', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5c-voice-v2-audio-playback-unlock')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice screen explains reflective purpose and mode selector', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(content, /ORB_VOICE_V2_SUPPORTING/)
    assert.match(station, /ORB_VOICE_V2_MODE_PROMPT/)
    assert.match(station, /ORB_VOICE_V2_MODES/)
    const labels = ORB_VOICE_V2_MODES.map((m) => m.label)
    assert.ok(labels.includes('Reflect after an incident'))
    assert.ok(labels.includes('Safeguarding thinking'))
    assert.ok(labels.includes('Supervision prep'))
    assert.ok(labels.includes('Just talk it through'))
  })

  it('voice controls use Start conversation label', () => {
    assert.equal(orbVoiceV2PrimaryLabel('idle'), 'Start conversation')
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /data-orb-voice-start-conversation/)
  })

  it('microphone error and audio storage copy are honest', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_TRANSCRIPTION_ERROR/)
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_SAFETY_FOOTER/)
    const capture = read('lib/orb/voice-v2/orb-voice-v2-capture.ts')
    assert.match(capture, /getUserMedia/)
  })

  it('conversation panel and end summarise pathway exist', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(ORB_VOICE_V2_TRANSCRIPT_LABEL, 'Voice conversation')
    assert.equal(ORB_VOICE_V2_TRANSCRIPT_NOTE, 'Reflection notes — not yet a record')
    assert.match(station, /data-orb-voice-conversation-panel/)
    assert.match(station, /End and summarise/)
  })

  it('summary actions and handoff metadata are wired', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const handoff = read('lib/orb/voice-v2/orb-voice-v2-summary.ts')
    assert.equal(ORB_VOICE_V2_ADULT_REVIEW_LABEL, 'Generated for adult review')
    assert.match(station, /Copy summary/)
    assert.match(station, /Send to Dictate/)
    assert.match(station, /Open in ORB Write/)
    assert.match(station, /Save reflection/)
    assert.match(handoff, /source: 'orb_voice_v2'/)
    assert.match(handoff, /generated_for_adult_review/)
  })

  it('safeguarding reflective guidance includes local procedure boundary', () => {
    const service = read('../services/orb_voice_respond_service.py')
    assert.match(service, /safeguarding|local procedure/i)
  })

  it('single shell and no compliance guarantee language', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(shell, /phase-5c-voice-v2-audio-playback-unlock/)
    assert.doesNotMatch(station, /Ofsted approved|compliance guarantee|finalised record/i)
    assert.doesNotMatch(station, /ORB makes safeguarding decisions/i)
  })
})
