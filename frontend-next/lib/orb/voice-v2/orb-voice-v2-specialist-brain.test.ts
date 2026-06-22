import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION } from '../orb-visual-build.ts'
import { ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS } from './orb-voice-v2-copy.ts'
import { buildOrbVoiceV2ReflectionPacket } from './orb-voice-v2-reflection.ts'
import { createOrbVoiceV2Turn } from './orb-voice-v2-turns.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-voice-v2-specialist-brain', () => {
  it('build marker is phase-5l-voice-realtime-beta-siri-convergence', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5l-voice-realtime-beta-siri-convergence')
  })

  it('reflection packet includes bullying specialist sections', () => {
    const turns = [
      createOrbVoiceV2Turn('adult', 'Two young people and bullying in the home.'),
      createOrbVoiceV2Turn('orb', 'Who was involved and what did adults do?')
    ]
    const packet = buildOrbVoiceV2ReflectionPacket(turns, 'just_talk', 'elevenlabs', {
      intent: 'bullying_or_peer_conflict',
      sessionMemory: {
        keyPeopleMentioned: ['two young people'],
        possibleRecordType: 'incident_or_peer_conflict_record'
      }
    })
    assert.ok(packet.sections.youngPeopleInvolved)
    assert.ok(packet.sections.observedOrReported)
    assert.match(packet.summaryMarkdown, /Young people involved/)
    assert.match(packet.summaryMarkdown, /What was observed or reported/)
    assert.match(packet.summaryMarkdown, /Generated for adult review/)
  })

  it('spoken word cap aligned to specialist range', () => {
    assert.equal(ORB_VOICE_V2_LIVE_SPOKEN_MAX_WORDS, 55)
    assert.match(read('../services/orb_voice_spoken_compression_service.py'), /VOICE_SPECIALIST_MAX_WORDS = 55/)
  })

  it('brain route logging is safe', () => {
    const router = read('../services/orb_voice_brain_router_service.py')
    assert.match(router, /orb_voice_v2_brain_route/)
    assert.match(router, /intent=%s tier=%s/)
    assert.doesNotMatch(router, /logger\.(info|debug|warning)\([^)]*transcript=/)
  })
})
