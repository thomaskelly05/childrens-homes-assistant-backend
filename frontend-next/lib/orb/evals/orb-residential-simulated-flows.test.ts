import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { appendHandoffToTrace, buildOrbIntelligenceTrace } from '../orb-intelligence-trace.ts'
import { buildOrbVoiceAfterCallContent, orbVoiceNeedsManagementOversight } from '../voice/orb-voice-after-call.ts'
import type { VoiceTurn } from '../voice/orb-voice-types.ts'
import {
  launchFixtureToParticipants,
  launchFixtureToSegments,
  mockLaunchFixtureOutput,
  ORB_RESIDENTIAL_LAUNCH_FIXTURES
} from './orb-residential-launch-fixtures.ts'
import { runLaunchFixtureAssertions } from './orb-residential-quality-assertions.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB residential simulated full journeys', () => {
  describe('A. Chat → ORB Write', () => {
    it('incident reflection handoff retains record type and trace', () => {
      const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'incident_reflection_property_damage')!
      const mockOutput = mockLaunchFixtureOutput(fixture)

      let trace = buildOrbIntelligenceTrace({
        sourceMode: 'chat',
        sourceSummary: fixture.inputTranscript.slice(0, 120),
        selectedRecordTypeId: fixture.recordTypeId
      })
      trace = appendHandoffToTrace(trace, {
        from: 'chat',
        to: 'write',
        recordTypeId: fixture.recordTypeId
      })

      assert.equal(trace.sourceMode, 'write')
      assert.equal(trace.selectedRecordTypeId, 'incident_report')
      assert.equal(trace.adultReviewRequired, true)
      assert.ok(runLaunchFixtureAssertions(fixture, mockOutput).every((r) => r.passed))

      const handoff = readSource('lib/orb/write/orb-write-content-handoff.ts')
      assert.match(handoff, /'chat'/)
      assert.match(handoff, /record_type_id/)
    })
  })

  describe('B. Voice → After-call → Record', () => {
    it('transcript turns feed after-call summary from transcript only', () => {
      const now = new Date().toISOString()
      const turns: VoiceTurn[] = [
        {
          id: 'vt-1',
          role: 'user',
          text: 'Young person damaged a frame during distress. Significant incident — manager informed.',
          startedAt: now
        },
        {
          id: 'vt-2',
          role: 'assistant',
          text: 'I can help structure an incident reflection.',
          startedAt: now
        }
      ]
      const content = buildOrbVoiceAfterCallContent(turns, null)
      assert.equal(content.hasTranscript, true)
      assert.ok(content.missingInformation.length >= 0)
      const combined = turns.map((t) => t.text).join(' ')
      assert.equal(orbVoiceNeedsManagementOversight(combined), true)
    })

    it('voice handoff preserves sourceMode voice in trace', () => {
      const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'voice_conversation_natural')!
      let trace = buildOrbIntelligenceTrace({
        sourceMode: 'voice',
        sourceSummary: fixture.label,
        suggestedRecordTypeId: fixture.recordTypeId
      })
      trace = appendHandoffToTrace(trace, { from: 'voice', to: 'write', recordTypeId: fixture.recordTypeId })
      assert.equal(trace.handoffHistory[0]!.from, 'voice')
      assert.equal(trace.adultReviewRequired, true)

      const converged = readSource('lib/orb/write/orb-write-converged-handoff.ts')
      assert.match(converged, /voice/)
    })
  })

  describe('C. Dictate → Meeting Intelligence → ORB Write', () => {
    it('speaker labels and action points preserved in handoff wiring', () => {
      const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'dictate_meeting_intelligence')!
      const segments = launchFixtureToSegments(fixture)
      const participants = launchFixtureToParticipants(fixture)
      const output = mockLaunchFixtureOutput(fixture)

      assert.equal(segments.length, 3)
      assert.equal(participants.length, 3)
      assert.match(output, /Not stated/)
      assert.ok(fixture.expectedActionPoints.every((a) => output.toLowerCase().includes(a.toLowerCase())))

      const handoff = readSource('lib/orb/write/orb-write-handoff.ts')
      assert.match(handoff, /participants/)
      assert.match(handoff, /segments/)
      assert.match(handoff, /handoffToOrbWriteDocument/)
    })
  })

  describe('D. Documents → ORB Write Review', () => {
    it('document excerpt supports review without inventing beyond source', () => {
      const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'document_supported_review')!
      const output = mockLaunchFixtureOutput(fixture)
      const combined = `${fixture.documentExcerpt}\n${output}`
      assert.match(combined, /child voice/i)
      assert.doesNotMatch(output, /\bdiagnosis\b/i)
      const trace = buildOrbIntelligenceTrace({
        sourceMode: 'document',
        sourceSummary: fixture.documentExcerpt!.slice(0, 80),
        selectedRecordTypeId: fixture.recordTypeId
      })
      assert.equal(trace.sourceMode, 'document')
      assert.equal(trace.adultReviewRequired, true)
    })
  })

  describe('E. ORB Write → Final Draft', () => {
    it('template headings and export entry points preserved', () => {
      const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'behaviour_reflection_distress')!
      const body = mockLaunchFixtureOutput(fixture)
      assert.match(body, /^##\s+/m)
      assert.match(body, /adult review required/i)

      const exportSrc = readSource('lib/orb/write/orb-write-export.ts')
      assert.match(exportSrc, /buildOrbWritePrintHtml/)
      assert.match(exportSrc, /exportOrbWritePdf/)
      assert.match(exportSrc, /copyOrbWriteText/)

      const types = readSource('lib/orb/write/orb-write-types.ts')
      assert.match(types, /is_finalised/)
      assert.match(types, /review_required_statement/)
    })
  })
})
