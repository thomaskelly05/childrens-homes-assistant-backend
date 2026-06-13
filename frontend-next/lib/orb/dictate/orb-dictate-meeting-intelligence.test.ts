import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildSpeakersFromSegments,
  confirmSpeakerLabel,
  isGenericSpeakerLabel,
  SPEAKER_LABELLING_COPY
} from './orb-dictate-speaker-model.ts'
import {
  normalizeStructuredActions,
  parseActionPointFromString
} from './orb-dictate-action-points.ts'
import { formatSegmentSourceRef } from './orb-dictate-source-check.ts'
import type { OrbDictateTranscriptSegment } from './orb-dictate-speaker.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readFrameworkJson() {
  return JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../recording/orb-recording-framework.json'), 'utf8')
  )
}

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate meeting intelligence convergence', () => {
  it('unconfirmed speakers remain Speaker 1 / Speaker 2', () => {
    const segments: OrbDictateTranscriptSegment[] = [
      { id: 's1', speaker_label: 'Speaker 1', text: 'Hello', source: 'upload' },
      { id: 's2', speaker_label: 'Speaker 2', text: 'Hi', source: 'upload' }
    ]
    const speakers = buildSpeakersFromSegments(segments, [])
    assert.equal(speakers.length, 2)
    assert.ok(speakers.every((s) => !s.isConfirmed))
    assert.ok(speakers.every((s) => isGenericSpeakerLabel(s.displayLabel)))
  })

  it('adult-confirmed speaker names appear after confirm', () => {
    const segments: OrbDictateTranscriptSegment[] = [
      { id: 's1', speaker_id: 'spk1', speaker_label: 'Speaker 1', text: 'Hello', source: 'live' }
    ]
    const speakers = buildSpeakersFromSegments(segments, [])
    const confirmed = confirmSpeakerLabel(speakers[0], {
      name: 'Alex',
      role: 'Staff member',
      confirm: true
    })
    assert.equal(confirmed.isConfirmed, true)
    assert.equal(confirmed.confirmedName, 'Alex')
    assert.match(confirmed.displayLabel, /Alex/)
  })

  it('does not auto-confirm generic speaker labels as identities', () => {
    const segments: OrbDictateTranscriptSegment[] = [
      { id: 's1', speaker_label: 'Speaker 1', text: 'Test', source: 'upload' }
    ]
    const speakers = buildSpeakersFromSegments(segments, [])
    assert.equal(speakers[0].isConfirmed, false)
    assert.equal(speakers[0].source, 'diarised')
  })

  it('action points use Not stated when owner/deadline missing', () => {
    const point = parseActionPointFromString('Follow up with social worker')
    assert.equal(point.owner, 'Not stated')
    assert.equal(point.deadline, 'Not stated')
  })

  it('source references do not invent timestamps', () => {
    const ref = formatSegmentSourceRef({
      id: 's1',
      speaker_label: 'Speaker 2',
      text: 'We agreed actions',
      source: 'paste'
    })
    assert.match(ref, /transcript turn/)
    assert.doesNotMatch(ref, /\d{2}:\d{2}–\d{2}:\d{2}/)
  })

  it('meeting record types live in shared recording framework only', () => {
    const framework = readFrameworkJson()
    assert.equal(framework.record_types.length, 31)
    const ids = framework.record_types.map((r: { id: string }) => r.id)
    for (const id of [
      'meeting_notes',
      'professional_consultation',
      'home_visit_note',
      'assessment_notes',
      'supervision_discussion',
      'multi_agency_discussion',
      'strategy_safeguarding_discussion'
    ]) {
      assert.ok(ids.includes(id), `missing ${id}`)
    }
  })

  it('speaker labelling UI markers exist', () => {
    const labelling = readComponent('components/orb/dictate/OrbDictateSpeakerLabelling.tsx')
    assert.match(labelling, /data-orb-dictate-speaker-labelling/)
    assert.match(labelling, /SPEAKER_LABELLING_COPY/)
    assert.match(labelling, /Confirm label/)
  })

  it('action points panel and source check disclosure exist', () => {
    const panel = readComponent('components/orb/dictate/OrbDictateActionPointsPanel.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(panel, /data-orb-dictate-action-points/)
    assert.match(panel, /ACTION_POINTS_COPY/)
    assert.match(mobile, /data-orb-dictate-source-check-disclosure/)
  })

  it('governance copy uses British English product subtitle', () => {
    const stations = readFileSync(join(root, 'lib/orb/orb-residential-stations.ts'), 'utf8')
    assert.match(stations, /Record, upload or paste conversations/)
    assert.match(SPEAKER_LABELLING_COPY, /confirm names or roles/i)
  })

  it('structured actions normalise from string fallbacks', () => {
    const points = normalizeStructuredActions(undefined, ['Review safeguarding plan'], [])
    assert.equal(points.length, 1)
    assert.equal(points[0].action, 'Review safeguarding plan')
  })
})
