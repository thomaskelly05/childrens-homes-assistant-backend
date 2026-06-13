import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  diarisationConfidenceWarnings,
  mapDiarisationToOrbTranscriptSegments
} from './orb-dictate-diarisation.ts'
import { buildSpeakersFromSegments, confirmSpeakerLabel } from './orb-dictate-speaker-model.ts'

describe('ORB Dictate diarisation foundation', () => {
  it('maps mocked diarised provider output to transcript segments', () => {
    const result = mapDiarisationToOrbTranscriptSegments({
      diarisation_enabled: true,
      provider: 'mock',
      segments: [
        { id: 't1', speaker: 'SPEAKER_00', text: 'Opening remarks.', start: 0, end: 3, confidence: 0.92 },
        { id: 't2', speaker: 'SPEAKER_01', text: 'Thanks.', start: 3.1, end: 5, confidence: 0.87 }
      ]
    })
    assert.equal(result.segments.length, 2)
    assert.equal(result.hasProviderDiarisation, true)
    assert.ok(result.segments[0].speaker_label)
    assert.equal(result.segments[0].started_at, '00:00')
  })

  it('warns on low confidence speaker separation', () => {
    const result = mapDiarisationToOrbTranscriptSegments({
      segments: [{ speaker: 'Speaker 1', text: 'Muffled.', confidence: 0.35 }]
    })
    assert.ok(result.warnings.some((w) => /Low confidence/i.test(w)))
    assert.equal(result.segments[0].needs_review, true)
    assert.ok(diarisationConfidenceWarnings(result.segments).length > 0)
  })

  it('adult confirmation required for speaker names', () => {
    const result = mapDiarisationToOrbTranscriptSegments({
      segments: [
        { speaker: 'Speaker 1', text: 'Hello', confidence: 0.9 },
        { speaker: 'Speaker 2', text: 'Hi', confidence: 0.88 }
      ]
    })
    const speakers = buildSpeakersFromSegments(result.segments, [])
    assert.ok(speakers.every((s) => !s.isConfirmed))
    const confirmed = confirmSpeakerLabel(speakers[0], {
      name: 'Pat',
      role: 'Staff member',
      confirm: true
    })
    assert.equal(confirmed.isConfirmed, true)
    assert.equal(confirmed.confirmedName, 'Pat')
  })

  it('returns empty when no provider segments', () => {
    const result = mapDiarisationToOrbTranscriptSegments({ segments: [] })
    assert.equal(result.segments.length, 0)
    assert.equal(result.hasProviderDiarisation, false)
  })
})
