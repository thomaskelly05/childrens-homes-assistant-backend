import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { VOICE_CLIENT_EVENTS, VOICE_SERVER_EVENTS } from '../../lib/orb/voice/orb-voice-events.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice realtime provider pass', () => {
  it('realtime client does not auto-start microphone', () => {
    const client = readComponent('lib/orb/voice/orb-realtime-voice-client.ts')
    assert.match(client, /class OrbRealtimeVoiceClient/)
    assert.match(client, /async startMicrophone/)
    assert.doesNotMatch(client, /getUserMedia\(\{ audio: true \}\)[\s\S]*constructor/)
  })

  it('voice station probes realtime status before live conversation', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /fetchOrbVoiceRealtimeStatus/)
    assert.match(station, /beginOrbRealtimeVoiceConversation/)
    assert.match(station, /data-orb-voice-start-stage/)
    assert.match(station, /testMicrophoneLevel/)
    assert.match(station, /Live voice is unavailable right now|ORB_VOICE_UNAVAILABLE_HEADLINE/)
    assert.doesNotMatch(station, /new OrbRealtimeVoiceClient/)
    assert.doesNotMatch(station, /beginSpeechRecognitionCapture\(/)
  })

  it('voice client connects websocket when url returned', () => {
    const client = readComponent('lib/orb/voice/orb-realtime-voice-client.ts')
    assert.match(client, /new WebSocket/)
    assert.match(client, /websocket_url/)
    assert.match(client, /usesWebSocket/)
  })

  it('interrupt cancels synthesis in hook', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /speechSynthesis\?\.cancel/)
    assert.match(hook, /interruptForListen/)
  })

  it('VAD uses Web Audio analyser', () => {
    const vad = readComponent('lib/orb/voice/orb-voice-vad.ts')
    assert.match(vad, /createAnalyser/)
    assert.match(vad, /onSpeechStart/)
    assert.match(vad, /onSpeechEnd/)
  })

  it('hook stops mic tracks on endVoiceSession', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /releaseMicrophoneStream/)
    assert.match(hook, /endVoiceSession/)
  })

  it('transcript save includes provider metadata', () => {
    const save = readComponent('lib/orb/voice/save-voice-transcript.ts')
    assert.match(save, /provider\?:/)
    assert.match(save, /voice_transcript/)
  })

  it('developer details available in developer mode only', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /isOrbDeveloperMode/)
    assert.match(station, /developerMode \?/)
  })

  it('shared event contract names', () => {
    assert.equal(VOICE_CLIENT_EVENTS.userInterrupt, 'user.interrupt')
    assert.equal(VOICE_SERVER_EVENTS.interrupted, 'interrupted')
  })

  it('voice station does not show active orb without capture', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voiceSessionLive/)
    assert.match(station, /data-orb-voice-capture-active/)
  })

  it('dictate uses recordingUiState before showing recording', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /recordingUiState === 'recording'/)
    assert.match(dictate, /setRecordingUiState\('recording'\)/)
  })
})
