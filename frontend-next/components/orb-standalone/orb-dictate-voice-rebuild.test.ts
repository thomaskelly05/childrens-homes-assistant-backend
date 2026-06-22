import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate clean rebuild', () => {
  it('does not auto-start speech from useEffect or setTimeout on open', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.doesNotMatch(dictate, /initialAutoStart/)
    assert.doesNotMatch(dictate, /autoStartAttemptedRef/)
    assert.doesNotMatch(dictate, /setTimeout\(\(\) => \{[\s\S]*handleStart/)
  })

  it('starts SpeechRecognition from explicit user click handler', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(dictate, /handleStartSpeechTranscript/)
    assert.match(mobile, /data-orb-dictate-speech-start/)
    assert.match(dictate, /dictate_speech_start_clicked/)
    assert.match(dictate, /setStartSource\('user_click'\)/)
    assert.match(dictate, /beginDictateSpeechCapture/)
  })

  it('does not automatically fall back to MediaRecorder after speech failure', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const speechHandler =
      dictate.match(/async function handleStartSpeechTranscript[\s\S]*?async function handleBrowserSpeechFallbackClick/m)?.[0] ?? ''
    assert.doesNotMatch(speechHandler, /beginMediaRecorderCapture/)
    assert.match(dictate, /handleAudioFallbackClick/)
    assert.match(dictate, /OrbDictateRealtimeTranscription/)
  })

  it('exposes dictate state machine data attributes', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(dictate, /data-orb-dictate-state=/)
    assert.match(dictate, /data-orb-dictate-capture-mode=/)
    assert.match(dictate, /data-orb-dictate-start-source=/)
    assert.match(dictate, /Transcript captured|data-orb-dictate-captured-card|OrbDictateMobileExperience/)
    assert.match(dictate, /DICTATE_NO_SPEECH_MESSAGE|No speech was detected/)
    assert.match(mobile, /disabled=\{generating \|\| !effectiveInputText\.trim\(\)\}/)
  })

  it('dictate hook skips getUserMedia before SpeechRecognition for dictate', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const dictateCapture = hook.match(/const beginDictateSpeechCapture[\s\S]*?}, \[/)?.[0] ?? ''
    assert.doesNotMatch(dictateCapture, /requestMicrophonePermission/)
    assert.match(dictateCapture, /beginBrowserSpeechCapture\('dictate'\)/)
  })
})

describe('ORB Voice honest realtime', () => {
  it('probes session status without faking browser voice', () => {
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /fetchOrbVoiceRealtimeStatus/)
    assert.match(availability, /export async function isOrbRealtimeVoiceAvailable/)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const hook = readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /fetchOrbVoiceV2Status/)
    assert.match(hook, /startConversation/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /beginSpeechRecognitionCapture/)
    assert.match(hook, /transitionState\('error'\)/)
    assert.match(station, /data-orb-voice-ui-state=\{voice\.state\}/)
  })
})

describe('Composer mic routing rebuild', () => {
  it('defaults to dictate and does not auto-start dictate', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /return 'dictate'/)
    assert.doesNotMatch(companion, /openOrbDictatePanel\(\{ autoStart: true \}\)/)
    assert.match(companion, /Start recording when you are ready/)
    assert.match(companion, /composer_mic_clicked/)
  })

  it('?mic=voice opens voice only when realtime available', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /micQueryParam === 'voice'/)
    assert.match(companion, /voiceGenuinelyAvailable \? 'voice' : 'dictate'/)
  })
})

describe('Flight recorder data attributes', () => {
  it('reads dictate and voice debug attributes from DOM', () => {
    const recorder = readComponent('components/orb-standalone/orb-client-flight-recorder.tsx')
    assert.match(recorder, /dictateState/)
    assert.match(recorder, /dictateCaptureMode/)
    assert.match(recorder, /voiceSessionConnected/)
    assert.match(recorder, /voiceTransportLive|voice-transport-live/)
    assert.match(recorder, /voiceRealtimeAvailable/)
    assert.match(recorder, /Copy debug report/)
  })

  it('flight recorder events emitted from realtime modules', () => {
    const dictateRealtime = readComponent('lib/orb/dictate/orb-dictate-realtime.ts')
    assert.match(dictateRealtime, /realtime_status|dictate_realtime_session_requested/)
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /voice_status_received/)
    assert.match(availability, /voice_realtime_session_failed|voice_session_unavailable/)
  })
})
