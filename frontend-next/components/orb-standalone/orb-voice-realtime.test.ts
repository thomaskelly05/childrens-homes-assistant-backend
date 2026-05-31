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

  it('station uses explicit Start and realtime client', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-start/)
    assert.match(station, /OrbRealtimeVoiceClient/)
    assert.match(station, /Voice starts only when you press Start/)
    assert.match(station, /data-orb-voice-interrupt/)
    assert.doesNotMatch(station, /always.?listen/i)
  })

  it('voice client connects websocket when url returned', () => {
    const client = readComponent('lib/orb/voice/orb-realtime-voice-client.ts')
    assert.match(client, /new WebSocket/)
    assert.match(client, /websocket_url/)
    assert.match(client, /usesWebSocket/)
  })

  it('interrupt sends user.interrupt and cancels synthesis', () => {
    const client = readComponent('lib/orb/voice/orb-realtime-voice-client.ts')
    assert.match(client, /VOICE_CLIENT_EVENTS\.userInterrupt/)
    assert.match(client, /speechSynthesis\?\.cancel/)
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /speechSynthesis\.cancel/)
    assert.match(hook, /interruptForListen/)
  })

  it('VAD uses Web Audio analyser', () => {
    const vad = readComponent('lib/orb/voice/orb-voice-vad.ts')
    assert.match(vad, /createAnalyser/)
    assert.match(vad, /onSpeechStart/)
    assert.match(vad, /onSpeechEnd/)
  })

  it('close stops mic tracks', () => {
    const client = readComponent('lib/orb/voice/orb-realtime-voice-client.ts')
    assert.match(client, /getTracks\(\)\.forEach/)
    assert.match(client, /track\.stop/)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /realtimeRef\.current\?\.stop/)
  })

  it('transcript save includes provider metadata', () => {
    const save = readComponent('lib/orb/voice/save-voice-transcript.ts')
    assert.match(save, /provider\?:/)
    assert.match(save, /voice_transcript/)
  })

  it('developer details hidden from normal markup', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-developer-details/)
    assert.match(station, /isOrbDeveloperMode/)
  })

  it('shared event contract names', () => {
    assert.equal(VOICE_CLIENT_EVENTS.userInterrupt, 'user.interrupt')
    assert.equal(VOICE_SERVER_EVENTS.interrupted, 'interrupted')
  })

  it('voice session API uses honest provider types', () => {
    const api = readComponent('lib/orb/voice/orb-voice-client.ts')
    assert.match(api, /websocket_realtime/)
    assert.match(api, /browser_fallback/)
    assert.match(api, /\/orb\/voice\/session/)
  })
})
