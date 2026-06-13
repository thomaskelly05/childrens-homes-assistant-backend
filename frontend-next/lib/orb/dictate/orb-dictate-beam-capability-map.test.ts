import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_BEAM_CAPABILITIES,
  ORB_DICTATE_SAFE_COPY,
  capabilitiesNotSafeToClaimPublicly,
  getBeamCapability,
  validateBeamCapabilityMapTruthfulness
} from './orb-dictate-beam-capability-map.ts'
import { offlineRecordingPubliclyClaimable } from './orb-dictate-offline-readiness.ts'

describe('ORB Dictate Beam capability map truthfulness', () => {
  it('has no truthfulness violations', () => {
    const violations = validateBeamCapabilityMapTruthfulness()
    assert.deepEqual(violations, [])
  })

  it('missing/roadmap capabilities are not publicly claimable', () => {
    const notPublic = capabilitiesNotSafeToClaimPublicly()
    const autoDetect = getBeamCapability('online_meeting_auto_detection')
    assert.ok(autoDetect)
    assert.equal(autoDetect!.safeToClaimPublicly, false)
    assert.ok(notPublic.some((c) => c.id === 'translation_welsh'))
    assert.ok(notPublic.some((c) => c.id === 'real_diarisation'))
  })

  it('offline is not publicly claimable', () => {
    const offline = getBeamCapability('offline_no_low_internet')
    assert.ok(offline)
    assert.equal(offline!.safeToClaimPublicly, false)
    assert.equal(offlineRecordingPubliclyClaimable(), false)
  })

  it('enterprise security is not over-claimed publicly', () => {
    const ent = getBeamCapability('enterprise_security_compliance')
    assert.ok(ent)
    assert.equal(ent!.safeToClaimPublicly, false)
  })

  it('real diarisation is foundation only', () => {
    const diar = getBeamCapability('real_diarisation')
    assert.ok(diar)
    assert.equal(diar!.status, 'foundation')
    assert.equal(diar!.safeToClaimPublicly, false)
  })

  it('safe copy does not include prohibited claims', () => {
    const combined = Object.values(ORB_DICTATE_SAFE_COPY).join(' ')
    assert.doesNotMatch(combined, /offline/i)
    assert.doesNotMatch(combined, /HIPAA/i)
    assert.doesNotMatch(combined, /Welsh translation/i)
    assert.doesNotMatch(combined, /automatically identifies every speaker/i)
    assert.doesNotMatch(combined, /Teams.*automatically/i)
  })

  it('covers all eleven beam gap areas', () => {
    const gapIds = [
      'real_diarisation',
      'live_multi_speaker_mobile',
      'desktop_meeting_capture',
      'offline_no_low_internet',
      'online_meeting_auto_detection',
      'audio_replay_storage',
      'translation_welsh',
      'deleted_note_recovery',
      'team_analytics',
      'enterprise_security_compliance',
      'live_llm_meeting_minutes_quality'
    ]
    for (const id of gapIds) {
      assert.ok(getBeamCapability(id), `missing capability ${id}`)
    }
    assert.ok(ORB_DICTATE_BEAM_CAPABILITIES.length >= 19)
  })
})
