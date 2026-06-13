import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  LIVE_LLM_EVAL_REQUIREMENT,
  ORB_MEETING_MINUTES_FIXTURES,
  buildMeetingMinutesPromptScaffold,
  evaluateMeetingMinutesOutput,
  evaluateSourceReferences,
  mockMeetingMinutesOutput
} from './orb-dictate-meeting-minutes-eval.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('ORB Dictate meeting minutes evaluation harness', () => {
  it('has eight realistic meeting fixtures', () => {
    assert.equal(ORB_MEETING_MINUTES_FIXTURES.length, 8)
    const ids = ORB_MEETING_MINUTES_FIXTURES.map((f) => f.id)
    assert.ok(ids.includes('staff_handover'))
    assert.ok(ids.includes('strategy_safeguarding'))
    assert.ok(ids.includes('young_person_consultation'))
  })

  for (const fixture of ORB_MEETING_MINUTES_FIXTURES) {
    it(`${fixture.label} prompt scaffold includes speaker labels`, () => {
      const scaffold = buildMeetingMinutesPromptScaffold(fixture)
      assert.match(scaffold, /Transcript by speaker/i)
      assert.ok(scaffold.includes(fixture.noteType))
      for (const turn of fixture.transcriptTurns.slice(0, 2)) {
        assert.ok(scaffold.includes(turn.speaker_label))
      }
    })

    it(`${fixture.label} mock output passes deterministic checks`, () => {
      const mock = mockMeetingMinutesOutput(fixture)
      const result = evaluateMeetingMinutesOutput(fixture, mock)
      assert.equal(result.passed, true, result.failures.join('; '))
    })
  }

  it('prohibited patterns fail evaluation', () => {
    const fixture = ORB_MEETING_MINUTES_FIXTURES[0]
    const bad = evaluateMeetingMinutesOutput(fixture, {
      summary: 'The child was manipulative and diagnosed with ADHD.',
      professionalNote: 'HIPAA compliant record.',
      actions: []
    })
    assert.equal(bad.passed, false)
    assert.ok(bad.failures.length > 0)
  })

  it('source references do not fabricate timestamps', () => {
    const fixture = ORB_MEETING_MINUTES_FIXTURES[0]
    const issues = evaluateSourceReferences(fixture.transcriptTurns)
    assert.deepEqual(issues, [])
  })

  it('marks live LLM eval as staging requirement', () => {
    assert.match(LIVE_LLM_EVAL_REQUIREMENT, /staging|manual/i)
  })

  it('mobile transcript can display speaker labels', () => {
    const mobile = readFileSync(
      join(root, 'components/orb-standalone/orb-dictate-mobile-experience.tsx'),
      'utf8'
    )
    assert.match(mobile, /OrbDictateSpeakerLabelling/)
    assert.match(mobile, /data-orb-dictate-transcript-availability/)
  })

  it('audio replay not shown unless audio URL exists', () => {
    const station = readFileSync(join(root, 'components/orb-standalone/orb-dictate-station.tsx'), 'utf8')
    assert.doesNotMatch(station, /data-orb-audio-replay/)
    assert.match(station, /revokeObjectURL/)
  })

  it('deleted recovery not shown in saved outputs panel', () => {
    const saved = readFileSync(
      join(root, 'components/orb-standalone/orb-saved-outputs-panel.tsx'),
      'utf8'
    )
    assert.doesNotMatch(saved, /restore deleted|recover deleted|deleted note recovery/i)
  })
})
