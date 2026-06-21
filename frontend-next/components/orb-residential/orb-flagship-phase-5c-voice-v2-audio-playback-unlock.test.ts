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

describe('ORB Residential Phase 5C Voice v2 audio playback unlock', () => {
  it('voice v2 audio playback hardening remains in place', () => {
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-playback.ts'), /playOrbVoiceV2Audio/)
  })

  it('Start conversation unlocks audio playback pathway', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /unlockOrbVoiceV2AudioPlayback/)
    assert.match(hook, /setAudioUnlocked/)
    assert.match(hook, /audioUnlocked/)
  })

  it('audio.play NotAllowedError is caught and manual play is offered', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const playback = read('lib/orb/voice-v2/orb-voice-v2-playback.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(playback, /playOrbVoiceV2Audio/)
    assert.match(playback, /isNotAllowedError/)
    assert.match(hook, /playOrbVoiceV2Audio/)
    assert.match(hook, /setPlaybackState\('blocked'\)/)
    assert.match(hook, /playOrbVoice/)
    assert.match(station, /ORB_VOICE_V2_PLAY_ORB_VOICE/)
    assert.match(station, /data-orb-voice-play-orb-voice/)
  })

  it('manual play keeps fetched blob and ORB text stays visible', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /pendingPlaybackRef/)
    assert.match(hook, /createOrbVoiceV2PlaybackSession/)
    assert.match(station, /data-orb-voice-turns/)
    assert.match(station, /data-orb-voice-v2-transcript/)
  })

  it('fallback provider copy uses backend status', () => {
    const permissions = read('lib/orb/voice-v2/orb-voice-v2-permissions.ts')
    const copy = read('lib/orb/voice-v2/orb-voice-v2-copy.ts')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(permissions, /Katherine ready/)
    assert.match(copy, /forced in server settings/)
    assert.match(hook, /ORB_VOICE_V2_FALLBACK_VOICE_TURN/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /X-ORB-TTS-Fallback/)
  })

  it('voice v2 routes remain active without legacy station imports', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice|useOrbWebVoiceEngine|OrbVoiceLaunchControls/)
  })
})
