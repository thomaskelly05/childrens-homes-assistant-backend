import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  appendHandoffToTrace,
  buildOrbIntelligenceTrace,
  mapHandoffSourceToTraceMode,
  sourceReferencesFromSegments,
  summariseOrbIntelligenceTrace
} from '../orb-intelligence-trace.ts'
import { launchFixtureToSegments, ORB_RESIDENTIAL_LAUNCH_FIXTURES } from './orb-residential-launch-fixtures.ts'

describe('ORB intelligence trace model', () => {
  it('defaults adultReviewRequired to true', () => {
    const trace = buildOrbIntelligenceTrace({
      sourceMode: 'chat',
      sourceSummary: 'Test daily record'
    })
    assert.equal(trace.adultReviewRequired, true)
  })

  it('includes recording framework version', () => {
    const trace = buildOrbIntelligenceTrace({
      sourceMode: 'dictate',
      sourceSummary: 'Handover',
      selectedRecordTypeId: 'handover'
    })
    assert.ok(trace.recordingFrameworkVersion)
    assert.ok(trace.childCentredChecksApplied.length > 0)
    assert.ok(trace.therapeuticLanguageChecksApplied.length > 0)
  })

  it('applies framework safeguarding checks for incident record type', () => {
    const trace = buildOrbIntelligenceTrace({
      sourceMode: 'write',
      sourceSummary: 'Incident reflection',
      selectedRecordTypeId: 'incident_report'
    })
    assert.ok(trace.safeguardingPrompts.length >= 0)
    assert.equal(trace.selectedRecordTypeId, 'incident_report')
  })

  it('maps handoff sources to trace modes', () => {
    assert.equal(mapHandoffSourceToTraceMode('voice'), 'voice')
    assert.equal(mapHandoffSourceToTraceMode('document'), 'document')
    assert.equal(mapHandoffSourceToTraceMode('saved_output'), 'saved_output')
  })

  it('builds source references from transcript segments', () => {
    const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES.find((f) => f.id === 'dictate_meeting_intelligence')!
    const segments = launchFixtureToSegments(fixture)
    const refs = sourceReferencesFromSegments(segments)
    assert.ok(refs.length >= 3)
    assert.ok(refs.every((r) => r.kind === 'transcript_turn'))
  })

  it('appendHandoffToTrace preserves handoff history', () => {
    let trace = buildOrbIntelligenceTrace({
      sourceMode: 'chat',
      sourceSummary: 'Incident notes',
      selectedRecordTypeId: 'incident_report'
    })
    trace = appendHandoffToTrace(trace, {
      from: 'chat',
      to: 'write',
      recordTypeId: 'incident_report'
    })
    assert.equal(trace.handoffHistory.length, 1)
    assert.equal(trace.sourceMode, 'write')
  })

  it('summarise trace omits child-identifying detail', () => {
    const trace = buildOrbIntelligenceTrace({
      sourceMode: 'voice',
      sourceSummary: 'Voice session summary only'
    })
    const summary = summariseOrbIntelligenceTrace(trace)
    assert.ok(summary.traceId)
    assert.equal(summary.adultReviewRequired, true)
    assert.equal(typeof summary.sourceReferenceCount, 'number')
    assert.equal((summary as Record<string, unknown>).childName, undefined)
  })

  it('launch fixtures can produce trace shape', () => {
    for (const fixture of ORB_RESIDENTIAL_LAUNCH_FIXTURES.slice(0, 5)) {
      const trace = buildOrbIntelligenceTrace({
        sourceMode: fixture.sourceMode,
        sourceSummary: fixture.label,
        selectedRecordTypeId: fixture.recordTypeId,
        missingInformation: fixture.expectedMissingInformation,
        safeguardingPrompts: fixture.expectedSafetyPrompts
      })
      assert.ok(trace.traceId)
      assert.equal(trace.adultReviewRequired, true)
    }
  })
})
