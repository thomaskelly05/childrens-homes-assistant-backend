import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_VOICE_ADULT_REVIEW_LABEL,
  ORB_VOICE_AUDIO_NOT_STORED,
  ORB_VOICE_BUTTON_START,
  ORB_VOICE_BUTTON_STOP_LISTENING,
  ORB_VOICE_CONVERSATION_SUBLABEL,
  ORB_VOICE_CONVERSATION_TITLE,
  ORB_VOICE_END_AND_SUMMARISE,
  ORB_VOICE_MIC_ERROR,
  ORB_VOICE_REFLECTIVE_HERO_LINE,
  ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING,
  ORB_VOICE_SUMMARY_ACTION_COPY,
  ORB_VOICE_SUMMARY_OPEN_WRITE,
  ORB_VOICE_SUMMARY_SAVE_REFLECTION,
  ORB_VOICE_SUMMARY_SEND_DICTATE
} from '../../lib/orb/voice/orb-voice-reflective-copy.ts'
import { ORB_VOICE_REFLECTIVE_MODES } from '../../lib/orb/voice/orb-voice-reflective-modes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4A Voice reflective companion', () => {
  it('build version marker is phase-4e-voice-free-flowing-katherine', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4e-voice-free-flowing-katherine')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice screen explains reflective purpose and mode selector', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const selector = read('components/orb-residential/OrbVoiceReflectiveModeSelector.tsx')
    assert.equal(ORB_VOICE_REFLECTIVE_HERO_LINE, 'Talk it through with ORB before you write.')
    assert.match(content, /ORB_VOICE_V2_SUPPORTING/)
    assert.match(station, /OrbVoiceReflectiveModeSelector/)
    assert.match(selector, /ORB_VOICE_MODE_PROMPT/)
    const labels = ORB_VOICE_REFLECTIVE_MODES.map((m) => m.label)
    assert.ok(labels.includes('Reflect after an incident'))
    assert.ok(labels.includes('Safeguarding thinking'))
    assert.ok(labels.includes('Supervision prep'))
    assert.ok(labels.includes('Just talk it through'))
  })

  it('voice controls use Start talking and Stop listening with timer', () => {
    const uiState = read('lib/orb/voice/orb-voice-ui-state.ts')
    const launch = read('lib/orb/voice/orb-voice-launch-mode.ts')
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    assert.equal(ORB_VOICE_BUTTON_START, 'Start conversation')
    assert.equal(ORB_VOICE_BUTTON_STOP_LISTENING, 'Stop')
    assert.match(uiState, /ORB_VOICE_BUTTON_START/)
    assert.match(launch, /ORB_VOICE_BUTTON_STOP_LISTENING/)
    assert.match(live, /data-orb-voice-listening-timer/)
  })

  it('microphone error and audio storage copy are honest', () => {
    const uiState = read('lib/orb/voice/orb-voice-ui-state.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(uiState, /ORB_VOICE_MIC_ERROR/)
    assert.equal(ORB_VOICE_MIC_ERROR, 'Voice could not start. Check microphone permission or type your reflection instead.')
    assert.match(station, /ORB_VOICE_AUDIO_NOT_STORED/)
    const capture = read('lib/orb/voice/orb-voice-capture.ts')
    assert.match(capture, /ORB_VOICE_SPEECH_AUDIO_CONSTRAINTS/)
    assert.match(capture, /echoCancellation: true/)
  })

  it('conversation panel and end summarise pathway exist', () => {
    const conversation = read('components/orb-residential/OrbVoiceConversationPanel.tsx')
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.equal(ORB_VOICE_CONVERSATION_TITLE, 'Voice conversation')
    assert.equal(ORB_VOICE_CONVERSATION_SUBLABEL, 'Reflection notes — not yet a record')
    assert.match(conversation, /data-orb-voice-conversation-panel/)
    assert.match(live, /ORB_VOICE_END_AND_SUMMARISE/)
    assert.equal(ORB_VOICE_END_AND_SUMMARISE, 'End and summarise')
    assert.match(station, /OrbVoiceSummaryPanel/)
  })

  it('summary actions and handoff metadata are wired', () => {
    const summary = read('components/orb-residential/OrbVoiceSummaryPanel.tsx')
    const handoff = read('lib/orb/voice/orb-voice-handoff.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(summary, /ORB_VOICE_ADULT_REVIEW_LABEL/)
    assert.equal(ORB_VOICE_ADULT_REVIEW_LABEL, 'Generated for adult review')
    assert.equal(ORB_VOICE_SUMMARY_ACTION_COPY, 'Copy summary')
    assert.equal(ORB_VOICE_SUMMARY_SEND_DICTATE, 'Send to Dictate')
    assert.equal(ORB_VOICE_SUMMARY_OPEN_WRITE, 'Open in ORB Write')
    assert.equal(ORB_VOICE_SUMMARY_SAVE_REFLECTION, 'Save reflection')
    assert.match(handoff, /source: 'orb_voice'/)
    assert.match(handoff, /generated_for_adult_review/)
    assert.match(station, /buildOrbVoiceHandoffPayload/)
  })

  it('safeguarding reflective guidance includes local procedure boundary', () => {
    const engine = read('lib/orb/voice/orb-voice-conversation-engine.ts')
    assert.match(engine, /ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING/)
    assert.match(ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING, /safeguarding procedure/)
    assert.match(ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING, /reviewable summary/)
  })

  it('single shell and no compliance guarantee language', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(shell, /phase-4e-voice-free-flowing-katherine/)
    assert.doesNotMatch(station, /Ofsted approved|compliance guarantee|finalised record/i)
    assert.doesNotMatch(station, /ORB makes safeguarding decisions/i)
  })
})
