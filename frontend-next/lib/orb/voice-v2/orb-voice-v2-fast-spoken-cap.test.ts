import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  VOICE_FAST_SPOKEN_CHAR_CAP,
  VOICE_FAST_SPOKEN_CHAR_IDEAL,
  compressOrbVoiceReplyForSpeech
} from './orb-voice-v2-spoken-compression.ts'
import { capOrbVoiceV2SpokenText as capFromClient } from './orb-voice-v2-client.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice v2 fast spoken cap', () => {
  it('voice_fast hard cap is 120 characters or less', () => {
    assert.equal(VOICE_FAST_SPOKEN_CHAR_CAP, 120)
    assert.ok(VOICE_FAST_SPOKEN_CHAR_IDEAL >= 90)
    assert.ok(VOICE_FAST_SPOKEN_CHAR_IDEAL <= VOICE_FAST_SPOKEN_CHAR_CAP)
  })

  it('compresses long voice_fast replies under the hard cap', () => {
    const long =
      'This is a deliberately long reflective reply that should be compressed for Katherine speech in voice fast mode. ' +
      'It mentions supervision, immediate safety, and what adults saw without naming any child or young person.'
    const compressed = compressOrbVoiceReplyForSpeech(long, null, 'voice_fast')
    assert.ok(compressed.length <= VOICE_FAST_SPOKEN_CHAR_CAP)
  })

  it('client cap helper respects voice_fast tier', () => {
    const long =
      'Another long spoken line that must be clipped before TTS so Katherine does not read a full written essay aloud during live voice fast turns.'
    const capped = capFromClient(long, { tier: 'voice_fast' })
    assert.ok(capped.length <= VOICE_FAST_SPOKEN_CHAR_CAP)
  })

  it('written reply renders before TTS request in hook', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const writtenIndex = hook.indexOf('createOrbVoiceV2Turn')
    const speakIndex = hook.indexOf('void speakReplyRef.current')
    assert.ok(writtenIndex > 0)
    assert.ok(speakIndex > writtenIndex)
    assert.match(hook, /writtenReply/)
    assert.match(hook, /spokenReply/)
  })

  it('speak request uses live_voice context and tier', () => {
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /context: 'live_voice'/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /VOICE_FAST_SPOKEN_CHAR_CAP/)
  })

  it('backend fast spoken cap matches frontend', () => {
    assert.match(read('../services/orb_voice_spoken_compression_service.py'), /VOICE_FAST_SPOKEN_CHAR_CAP = 120/)
  })
})
