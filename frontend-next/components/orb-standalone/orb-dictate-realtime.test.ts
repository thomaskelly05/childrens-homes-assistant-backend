import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate realtime transcription', () => {
  it('Safari uses realtime_transcription when available', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /isSafariBrowser/)
    assert.match(station, /realtime_transcription/)
    assert.match(station, /OrbDictateRealtimeTranscription/)
    assert.match(station, /setCaptureMode\('realtime_transcription'\)/)
  })

  it('Safari does not auto-start SpeechRecognition on Start', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const startHandler =
      station.match(/async function handleStartSpeechTranscript[\s\S]*?async function handleBrowserSpeechFallbackClick/m)?.[0] ?? ''
    assert.doesNotMatch(startHandler, /beginDictateSpeechCapture\(\)/)
    assert.match(station, /handleBrowserSpeechFallbackClick/)
    assert.match(station, /browser_fallback_chosen/)
  })

  it('shows not-configured message when realtime missing', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE/)
    assert.match(station, /Safari: use server realtime/)
  })

  it('dictate realtime client calls backend session endpoint', () => {
    const client = readComponent('lib/orb/dictate/orb-dictate-realtime.ts')
    assert.match(client, /\/orb\/dictate\/realtime\/session/)
    assert.match(client, /transcriptionOnly: true/)
    assert.match(client, /dictate_realtime_session_requested/)
    assert.match(client, /dictate_realtime_transcript_delta/)
  })
})

describe('ORB Voice realtime sessions', () => {
  it('uses dedicated realtime voice session endpoint', () => {
    const voiceClient = readComponent('lib/orb/voice/orb-voice-client.ts')
    assert.match(voiceClient, /\/orb\/voice\/realtime\/session/)
    const availability = readComponent('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(availability, /voice_realtime_session_requested/)
    assert.match(availability, /voice_realtime_audio_started/)
  })

  it('voice station requires realtime before live session', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /realtimeVoiceReady/)
    assert.match(station, /OrbDictateMobileExperience/)
    assert.doesNotMatch(station, /Configure realtime voice to use this/)
    assert.match(station, /beginOrbRealtimeVoiceConversation/)
  })
})
