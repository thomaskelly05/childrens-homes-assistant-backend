import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  launchFixtureToParticipants,
  launchFixtureToSegments,
  mockLaunchFixtureOutput,
  ORB_LAUNCH_FIXTURE_MODES,
  ORB_LAUNCH_FIXTURE_RECORD_TYPES,
  ORB_RESIDENTIAL_LAUNCH_FIXTURES
} from './orb-residential-launch-fixtures.ts'
import {
  allAssertionsPassed,
  runLaunchFixtureAssertions
} from './orb-residential-quality-assertions.ts'

describe('ORB residential launch fixtures', () => {
  it('includes at least 15 launch scenarios', () => {
    assert.ok(ORB_RESIDENTIAL_LAUNCH_FIXTURES.length >= 15)
  })

  it('covers required scenario ids', () => {
    const ids = new Set(ORB_RESIDENTIAL_LAUNCH_FIXTURES.map((f) => f.id))
    const required = [
      'daily_record_school_upset',
      'incident_reflection_property_damage',
      'safeguarding_reflection_partial_disclosure',
      'handover_note_end_of_shift',
      'key_work_family_worries',
      'behaviour_reflection_distress',
      'supervision_preparation_challenging_shift',
      'management_oversight_incident_review',
      'meeting_notes_multi_speaker',
      'multi_agency_discussion',
      'home_visit_note',
      'strategy_safeguarding_discussion',
      'voice_conversation_natural',
      'dictate_meeting_intelligence',
      'document_supported_review'
    ]
    for (const id of required) {
      assert.ok(ids.has(id), `Missing fixture: ${id}`)
    }
  })

  it('covers chat voice dictate write document modes', () => {
    const modes = new Set(ORB_LAUNCH_FIXTURE_MODES)
    assert.ok(modes.has('chat'))
    assert.ok(modes.has('voice'))
    assert.ok(modes.has('dictate'))
    assert.ok(modes.has('write'))
    assert.ok(modes.has('document'))
  })

  it('covers multiple record types', () => {
    assert.ok(ORB_LAUNCH_FIXTURE_RECORD_TYPES.length >= 8)
  })

  it('fixtures have no real child names — generic young person only', () => {
    for (const fixture of ORB_RESIDENTIAL_LAUNCH_FIXTURES) {
      assert.doesNotMatch(fixture.inputTranscript, /\b(Jay|Smith|Jones|Williams)\b/)
      assert.ok(fixture.prohibitedOutputPatterns.length > 0)
      assert.ok(fixture.expectedHeadings.length > 0)
    }
  })

  it('mock output passes quality assertions for all fixtures', () => {
    for (const fixture of ORB_RESIDENTIAL_LAUNCH_FIXTURES) {
      const output = mockLaunchFixtureOutput(fixture)
      const results = runLaunchFixtureAssertions(fixture, output)
      const failures = results.filter((r) => !r.passed)
      assert.ok(
        allAssertionsPassed(results),
        `Fixture ${fixture.id} failed: ${failures.flatMap((f) => f.failures).join('; ')}`
      )
    }
  })

  it('speaker fixtures produce segments and participants', () => {
    const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'meeting_notes_multi_speaker')!
    const segments = launchFixtureToSegments(fixture)
    const participants = launchFixtureToParticipants(fixture)
    assert.equal(segments.length, 3)
    assert.equal(participants.length, 3)
    assert.ok(participants.every((p) => p.introducedBy === 'manual'))
  })
})
