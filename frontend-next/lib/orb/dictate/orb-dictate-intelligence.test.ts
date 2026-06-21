import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCleanDictateCopy,
  buildDictateIntelligenceRequest,
  buildDictateMissingInfoReview,
  buildDictateSavePacket,
  transcriptForIntelligence
} from './orb-dictate-intelligence-request.ts'
import { buildInitialWorkingDocument, parseWorkingDocument } from './orb-dictate-working-document.ts'

const TOM_SUPERVISION =
  "My name is Tom Kelly, I'm the registered manager, and I'm here with Sarah. She is here for supervision for the month. This month we are going to focus on the outcomes of young people within the home."

describe('ORB Dictate intelligence', () => {
  it('builds intelligence request with template, transcript, privacy mode and people', () => {
    const request = buildDictateIntelligenceRequest({
      templateId: 'supervision_prep',
      transcript: TOM_SUPERVISION,
      contentSource: 'paste',
      noteType: 'supervision_reflection',
      peopleToConfirm: [{ id: 'p1', label: 'Tom Kelly', status: 'needs_confirmation' }]
    })
    assert.equal(request.templateType, 'supervision_prep')
    assert.equal(request.transcriptPrivacyMode, 'internal_working')
    assert.ok(request.originalTranscript.includes('Tom Kelly'))
    assert.equal(request.peopleToConfirm?.length, 1)
    assert.equal(request.sourceType, 'paste')
  })

  it('uses internal working transcript for intelligence by default', () => {
    const request = buildDictateIntelligenceRequest({
      templateId: 'supervision_prep',
      transcript: 'My name is Tom Kelly',
      transcriptBundle: {
        originalTranscript: 'My name is Tom Kelly',
        redactedTranscript: 'My name is [NAME_1]',
        workingTranscript: 'My name is Tom Kelly',
        transcriptPrivacyMode: 'internal_working'
      }
    })
    assert.equal(transcriptForIntelligence(request), 'My name is Tom Kelly')
  })

  it('uses redacted transcript only in redacted export mode', () => {
    const request = buildDictateIntelligenceRequest({
      templateId: 'general',
      transcript: '[NAME_1]',
      transcriptBundle: {
        originalTranscript: 'Tom Kelly',
        redactedTranscript: '[NAME_1]',
        workingTranscript: '[NAME_1]',
        transcriptPrivacyMode: 'redacted_export'
      }
    })
    assert.equal(transcriptForIntelligence(request), '[NAME_1]')
  })

  it('local working document includes source metadata for supervision transcript', () => {
    const markdown = buildInitialWorkingDocument(TOM_SUPERVISION, 'supervision_prep')
    const sections = parseWorkingDocument(markdown)
    const whatHappened = sections.find((section) => section.heading === 'What happened')
    const impact = sections.find((section) => section.heading === 'Impact on practice')
    assert.ok(whatHappened?.body.includes('Tom Kelly'))
    assert.equal(whatHappened?.sourceType, 'transcript')
    assert.equal(impact?.sourceType, 'transcript')
    const wentWell = sections.find((section) => section.heading === 'What went well')
    assert.equal(wentWell?.sourceType, 'missing_guidance')
  })

  it('clean copy strips placeholder guidance', () => {
    const markdown = buildInitialWorkingDocument(TOM_SUPERVISION, 'supervision_prep')
    const copied = buildCleanDictateCopy(markdown)
    assert.ok(copied.includes('Tom Kelly'))
    assert.ok(!copied.includes('Not captured yet'))
  })

  it('save packet includes dictate metadata fields', () => {
    const request = buildDictateIntelligenceRequest({
      templateId: 'supervision_prep',
      transcript: TOM_SUPERVISION
    })
    const packet = buildDictateSavePacket({
      request,
      workingDocument: buildInitialWorkingDocument(TOM_SUPERVISION, 'supervision_prep')
    })
    assert.equal(packet.source, 'orb_dictate')
    assert.equal(packet.adultReviewStatus, 'generated_for_adult_review')
    assert.ok(packet.workingDocument.includes('Tom Kelly'))
  })

  it('missing-information review returns concise checklist items', () => {
    const request = buildDictateIntelligenceRequest({
      templateId: 'supervision_prep',
      transcript: TOM_SUPERVISION,
      workingDocument: buildInitialWorkingDocument(TOM_SUPERVISION, 'supervision_prep')
    })
    const items = buildDictateMissingInfoReview(request)
    assert.ok(items.length >= 1)
    assert.ok(items.length <= 6)
  })
})
