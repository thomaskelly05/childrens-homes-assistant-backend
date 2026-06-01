import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  canUseLiveVoice,
  orbMicDevLog,
  orbVoiceReadinessPresentation
} from '../../lib/orb/voice/orb-voice-readiness.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mic gating and routing', () => {
  it('inactive subscription disables live Voice Start with visible reason', () => {
    const ui = orbVoiceReadinessPresentation(
      {
        microphone_permission: 'unknown',
        browser_supported: true,
        realtime_service_available: true,
        secure_context: true,
        can_record_audio: true,
        can_use_realtime_voice: false,
        fallback_available: true
      },
      { subscriptionActive: false, canUseLiveVoice: false }
    )
    assert.equal(ui.state, 'subscription_inactive')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /Activate subscription to use live voice/)
    assert.match(station, /data-orb-voice-start-blocked/)
    assert.match(station, /disabled=\{startDisabled\}/)
  })

  it('inactive subscription keeps Open Dictate enabled', () => {
    const ui = orbVoiceReadinessPresentation(
      {
        microphone_permission: 'unknown',
        browser_supported: true,
        realtime_service_available: true,
        secure_context: true,
        can_record_audio: true,
        can_use_realtime_voice: false,
        fallback_available: true
      },
      { subscriptionActive: false, canUseLiveVoice: false }
    )
    assert.equal(ui.showOpenDictate, true)
    assert.equal(ui.showTypeInstead, true)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const openDictateButton = station.match(
      /<button[\s\S]*?data-orb-voice-open-dictate[\s\S]*?<\/button>/
    )?.[0]
    assert.ok(openDictateButton, 'expected Open Dictate button')
    assert.doesNotMatch(openDictateButton ?? '', /\bdisabled=/)
  })

  it('dictate record is not blocked by subscription', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.doesNotMatch(dictate, /subscriptionActive/)
    assert.match(dictate, /handleSelectStartMode/)
    assert.match(dictate, /record_note.*handleStartRecording|handleStartRecording/s)
    assert.match(dictate, /data-orb-dictate-start=\{id\}/)
  })

  it('composer mic routes to Dictate when live Voice is inactive', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /opening dictate fallback/)
    assert.match(companion, /openOrbDictatePanel/)
    assert.match(companion, /Live voice is not available\. Dictate is open/)
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-mic-route/)
    assert.doesNotMatch(composer, /disabled=\{!voiceCaptureEnabled \|\| !voiceRecognitionAvailable\}/)
  })

  it('disabled voice start only when intentionally blocked', () => {
    assert.equal(canUseLiveVoice({ subscriptionActive: false }), false)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-start-disabled-reason/)
    assert.match(station, /liveVoiceAllowed/)
  })

  it('dictate Record note button fires recording handler', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /data-orb-dictate-start=\{id\}/)
    assert.match(dictate, /handleSelectStartMode\(id\)/)
    assert.match(dictate, /data-orb-dictate-record-start/)
    assert.match(dictate, /orbMicDevLog\('dictate record clicked'/)
  })

  it('voice does not use MediaRecorder as live voice fallback', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /beginSpeechRecognitionCapture/)
    assert.match(station, /beginSpeechRecognitionCapture/)
    assert.doesNotMatch(station, /beginUserVoiceCapture\(\)/)
    assert.match(station, /beginBrowserSpeechCapture/)
  })

  it('voice routes to dictate when speech recognition unavailable', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /shouldOpenDictateFallback/)
    assert.match(station, /Open Dictate to record or paste notes/)
    assert.match(station, /data-orb-voice-open-dictate/)
  })

  it('dictate handleStartRecording uses explicit mode', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /handleStartRecording\(mode\?: OrbDictateStartMode\)/)
    assert.match(dictate, /handleStartRecording\(id\)/)
    assert.match(dictate, /effectiveStartMode = mode \?\? startMode/)
  })

  it('dictate keeps append-only transcript buffer', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /transcriptBufferRef/)
    assert.match(dictate, /lastDictateTranscriptRef/)
  })

  it('dictate paste and generate status messages exist', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /Transcript added\./)
    assert.match(dictate, /Generating professional note/)
    assert.match(dictate, /Professional note ready\./)
    assert.match(dictate, /Generation service unavailable — local draft created/)
    assert.match(dictate, /buildLocalDictateFallback/)
  })

  it('composer mic aria is open voice or dictate', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /composerMicAriaLabel="Open voice or Dictate"/)
  })

})
