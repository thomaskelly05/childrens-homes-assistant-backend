import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('useOrbVoiceSpeechEnergy hook contract', () => {
  it('samples assistant audio via Web Audio API with session-registry fallback', () => {
    const hook = read('lib/orb/voice/use-orb-voice-speech-energy.ts')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const network = read('lib/orb/network/index.ts')
    const webrtc = read('lib/orb/voice/orb-openai-realtime-webrtc-client.ts')
    const client = read('lib/orb/voice/orb-realtime-voice-client.ts')

    assert.match(hook, /export function useOrbVoiceSpeechEnergy/)
    assert.match(hook, /AnalyserNode/)
    assert.match(hook, /requestAnimationFrame/)
    assert.match(hook, /getActiveOrbRealtimeVoiceClient/)
    assert.match(hook, /createMediaStreamSource/)
    assert.match(network, /getRemoteAudioElement/)
    assert.match(webrtc, /getAssistantAudioElement/)
    assert.match(client, /getAssistantAudioElement/)
    assert.match(head, /useOrbVoiceSpeechEnergy/)
    assert.match(head, /--orb-voice-speech-energy/)
    assert.match(head, /--orb-voice-core-scale/)
    assert.match(head, /data-orb-voice-speech-driven/)
  })
})
