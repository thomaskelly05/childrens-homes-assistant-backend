import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_VOICE_V2_LIVE_SPOKEN_CAP } from './orb-voice-v2-copy.ts'
import { buildOrbVoiceV2Handoff, buildOrbVoiceV2Summary } from './orb-voice-v2-summary.ts'
import { createOrbVoiceV2Turn } from './orb-voice-v2-turns.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function capSpoken(text: string): string {
  const cleaned = text.replace(/\*\*/g, '').replace(/[#*_`]/g, '').trim()
  if (cleaned.length <= ORB_VOICE_V2_LIVE_SPOKEN_CAP) return cleaned
  return cleaned.slice(0, ORB_VOICE_V2_LIVE_SPOKEN_CAP).trim()
}

describe('orb-voice-v2-flow', () => {
  it('summary includes adult review label and conversation content', () => {
    const turns = [
      createOrbVoiceV2Turn('adult', 'They were upset after contact.'),
      createOrbVoiceV2Turn('orb', 'What happened just before that?')
    ]
    const summary = buildOrbVoiceV2Summary(turns, 'just_talk')
    assert.match(summary, /Generated for adult review/)
    assert.match(summary, /upset after contact/)
  })

  it('handoff preserves v2 metadata', () => {
    const turns = [createOrbVoiceV2Turn('adult', 'Test')]
    const summary = buildOrbVoiceV2Summary(turns, 'daily_reflection')
    const handoff = buildOrbVoiceV2Handoff(turns, 'daily_reflection', summary, 'elevenlabs')
    assert.equal(handoff.source, 'orb_voice_v2')
    assert.equal(handoff.audioStored, false)
    assert.equal(handoff.adultReviewStatus, 'generated_for_adult_review')
  })

  it('hook resumes listening after TTS and uses one speak call path', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /spokenTurnKeysRef/)
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(hook, /audio\.onended/)
    assert.match(hook, /resumeListening/)
  })

  it('TTS text cap strips markdown before speak request', () => {
    const spoken = capSpoken('**Hello** `#debug`')
    assert.doesNotMatch(spoken, /\*\*|#/)
  })
})
