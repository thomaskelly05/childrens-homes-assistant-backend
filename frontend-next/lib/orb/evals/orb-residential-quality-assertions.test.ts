import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assertChildCentredOutput,
  assertMeetingIntelligence,
  assertOrbWriteReadiness,
  assertRecordingQuality,
  assertSafeguardingBoundaries,
  assertTherapeuticLanguage
} from './orb-residential-quality-assertions.ts'

describe('ORB residential quality assertions', () => {
  const goodOutput = `## What happened
Young person returned upset. Presentation: low mood, quiet.

## Child voice
Young person said school was difficult.

## Adult response
Staff offered quiet space and sat with them.

## Outcome
Mood improved by evening. Follow-up with school: Not stated.

Adult review required before saving or exporting.`

  const badTherapeutic = 'The young person was manipulative and attention-seeking. They kicked off.'

  it('passes child-centred output with voice and support', () => {
    const result = assertChildCentredOutput(goodOutput, { childVoiceProvided: true })
    assert.equal(result.passed, true)
  })

  it('fails judgemental therapeutic language', () => {
    const result = assertTherapeuticLanguage(badTherapeutic)
    assert.equal(result.passed, false)
    assert.ok(result.failures.some((f) => f.includes('manipulative')))
  })

  it('recording quality expects missing information markers', () => {
    const result = assertRecordingQuality(goodOutput, 'Young person returned upset. Staff supported.')
    assert.equal(result.passed, true)
  })

  it('safeguarding blocks delay escalation', () => {
    const result = assertSafeguardingBoundaries('Wait until Monday before telling the manager.', {
      recordTypeId: 'safeguarding_concern',
      expectedSafetyPrompts: ['escalat']
    })
    assert.equal(result.passed, false)
  })

  it('meeting intelligence preserves speaker labels', () => {
    const output = 'Speaker 1: Education discussed. Actions: report by Wednesday — owner: Not stated.'
    const result = assertMeetingIntelligence(output, {
      confirmedSpeakers: ['Speaker 1', 'Speaker 2'],
      sourceTranscript: 'Speaker 1: Education. Speaker 2: Social worker.'
    })
    assert.equal(result.passed, false)
    assert.ok(result.failures.some((f) => f.includes('Speaker 2')))
  })

  it('ORB Write readiness requires adult review and headings', () => {
    const result = assertOrbWriteReadiness(goodOutput)
    assert.equal(result.passed, true)
  })

  it('ORB Write readiness fails without review statement', () => {
    const result = assertOrbWriteReadiness('Plain text without structure.')
    assert.equal(result.passed, false)
  })
})
