import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPeopleToConfirm, extractPresentPeopleNames } from './orb-dictate-people-identification.ts'
import {
  buildTranscriptBundleFromApiPayload,
  buildTranscriptBundleFromText,
  ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE,
  resolveWorkingTranscript,
  workingTranscriptForPrivacyMode
} from './orb-dictate-transcript-privacy.ts'
import {
  buildInitialWorkingDocument,
  mapTranscriptToSections
} from './orb-dictate-working-document.ts'

const TOM_SUPERVISION =
  "My name is Tom Kelly, I'm the registered manager, and I'm here with Sarah. She is here for supervision for the month. This month we are going to focus on the outcomes of young people within the home."

const REDACTED_SUPERVISION =
  "My name is [NAME_1], I'm the registered manager. She is here for supervision for the month."

describe('ORB Dictate identity mapping', () => {
  it('defaults to internal working transcript privacy mode', () => {
    assert.equal(ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE, 'internal_working')
    const bundle = buildTranscriptBundleFromText('My name is Tom Kelly')
    assert.equal(bundle.transcriptPrivacyMode, 'internal_working')
    assert.equal(bundle.workingTranscript, 'My name is Tom Kelly')
  })

  it('uses original transcript for internal working mode when API provides both', () => {
    const bundle = buildTranscriptBundleFromApiPayload({
      transcript: 'My name is Tom Kelly',
      original_transcript: 'My name is Tom Kelly',
      redacted_transcript: 'My name is [NAME_1]',
      transcript_privacy_mode: 'internal_working',
      redaction_applied: true
    })
    assert.equal(resolveWorkingTranscript(bundle), 'My name is Tom Kelly')
    assert.equal(bundle.redactedTranscript, 'My name is [NAME_1]')
  })

  it('falls back to redacted transcript only when raw is unavailable', () => {
    const bundle = buildTranscriptBundleFromApiPayload({
      transcript: 'My name is [NAME_1]',
      redacted_transcript: 'My name is [NAME_1]',
      raw_transcript_unavailable: true
    })
    assert.equal(bundle.rawTranscriptUnavailable, true)
    assert.equal(resolveWorkingTranscript(bundle), 'My name is [NAME_1]')
  })

  it('redacted export mode can use redacted variant', () => {
    const bundle = buildTranscriptBundleFromApiPayload({
      original_transcript: 'My name is Tom Kelly',
      redacted_transcript: 'My name is [NAME_1]',
      transcript_privacy_mode: 'redacted_export'
    })
    assert.equal(workingTranscriptForPrivacyMode(bundle, 'redacted_export'), 'My name is [NAME_1]')
  })

  it('detects Tom Kelly as speaker and registered manager role', () => {
    const people = buildPeopleToConfirm('My name is Tom Kelly. I am the registered manager.')
    assert.ok(people.some((item) => item.label === 'Tom Kelly'))
    assert.ok(
      people.some(
        (item) => item.label === 'Tom Kelly' && item.detail?.includes('Registered Manager')
      )
    )
  })

  it('detects Sarah as present from here-with phrasing', () => {
    const names = extractPresentPeopleNames("I'm here with Sarah", 'Tom Kelly')
    assert.deepEqual(names, ['Sarah'])
    const people = buildPeopleToConfirm(TOM_SUPERVISION)
    assert.ok(people.some((item) => item.label === 'Sarah'))
  })

  it('detects Sarah as supervision participant', () => {
    const people = buildPeopleToConfirm('Sarah is here for supervision this month.')
    assert.ok(
      people.some(
        (item) =>
          item.label === 'Sarah' && item.detail?.toLowerCase().includes('supervision participant')
      )
    )
  })

  it('detects multiple names cautiously from present list phrasing', () => {
    const names = extractPresentPeopleNames('In the room today are Sarah, James and Beth present')
    assert.deepEqual(names, ['Sarah', 'James', 'Beth'])
  })

  it('maps Tom Kelly supervision intro into supervision sections', () => {
    const sections = mapTranscriptToSections(TOM_SUPERVISION, 'supervision_prep')
    const whatHappened = sections.find((section) => section.heading === 'What happened')
    const impact = sections.find((section) => section.heading === 'Impact on practice')
    assert.ok(whatHappened?.body.includes('Tom Kelly'))
    assert.ok(whatHappened?.body.includes('Registered Manager'))
    assert.ok(whatHappened?.body.includes('Sarah'))
    assert.ok(impact?.body.includes('outcomes for young people within the home'))
  })

  it('maps redacted supervision intro when only redacted text exists', () => {
    const sections = mapTranscriptToSections(REDACTED_SUPERVISION, 'supervision_prep')
    const whatHappened = sections.find((section) => section.heading === 'What happened')
    assert.ok(whatHappened?.body.includes('[NAME_1]'))
    assert.ok(whatHappened?.body.includes('another person was present'))
  })

  it('team meeting introduction instruction creates useful general document content', () => {
    const sections = mapTranscriptToSections(TOM_SUPERVISION, 'general', {
      adultInstruction: 'this is for a team meeting introduction'
    })
    const summary = sections.find((section) => section.heading === 'Summary')
    const keyDetails = sections.find((section) => section.heading === 'Key details captured')
    const nextStep = sections.find((section) => section.heading === 'Suggested next step')
    assert.ok(summary?.body.includes('team meeting'))
    assert.ok(keyDetails?.body.includes('introduced themselves'))
    assert.ok(nextStep?.body.includes('Continue recording'))
  })

  it('does not leave document blank when transcript contains usable text', () => {
    const mapped = buildInitialWorkingDocument(TOM_SUPERVISION, 'supervision_prep')
    assert.ok(mapped.trim().length > 0)
    assert.ok(mapped.includes('Tom Kelly'))
    assert.ok(mapped.includes('outcomes for young people'))
  })
})
