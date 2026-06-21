import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPeopleToConfirm } from './orb-dictate-people-identification.ts'
import {
  buildInitialWorkingDocument,
  isOrbDictateSectionPlaceholder,
  isWorkingDocumentUnmappedScaffold,
  mapTranscriptToSections
} from './orb-dictate-working-document.ts'

const SUPERVISION_INTRO =
  "My name's [NAME_1], I'm the registered manager, today's date is the 21st of June 2026 and we're here to discuss today's supervision with..."

const FOOTBALL_DAILY =
  'Today little Johnny was having a nice time playing football with the other young people in the home. There were a couple of clashes about the rules of the game, but nothing major. Staff checked in with Johnny afterwards and he said he was okay.'

describe('ORB Dictate transcript mapping', () => {
  it('general dictation intro populates summary and key details', () => {
    const sections = mapTranscriptToSections(SUPERVISION_INTRO, 'general')
    const summary = sections.find((section) => section.heading === 'Summary')
    const details = sections.find((section) => section.heading === 'Key details captured')
    assert.ok(summary?.body.includes('[NAME_1]'))
    assert.ok(summary?.body.includes('registered manager'))
    assert.ok(details?.body.includes('registered manager role mentioned'))
    assert.ok(details?.body.includes('supervision discussion mentioned'))
  })

  it('supervision intro maps to supervision reflection headings', () => {
    const sections = mapTranscriptToSections(SUPERVISION_INTRO, 'supervision_prep')
    const whatHappened = sections.find((section) => section.heading === 'What happened')
    const impact = sections.find((section) => section.heading === 'Impact on practice')
    assert.ok(whatHappened?.body.includes('[NAME_1]'))
    assert.ok(whatHappened?.body.includes('supervision discussion'))
    assert.ok(isOrbDictateSectionPlaceholder(impact?.body ?? ''))
  })

  it('football daily record maps across key sections', () => {
    const sections = mapTranscriptToSections(FOOTBALL_DAILY, 'daily_record')
    const summary = sections.find((section) => section.heading === 'Summary of the day')
    const presentation = sections.find((section) => section.heading === 'Child\u2019s presentation')
    const interactions = sections.find((section) => section.heading === 'Key interactions')
    const adultSupport = sections.find((section) => section.heading === 'Adult support')
    const childVoice = sections.find((section) => section.heading === 'Child\u2019s voice')

    assert.ok(summary?.body.includes('football'))
    assert.ok(presentation?.body.length)
    assert.ok(interactions?.body.includes('football') || interactions?.body.includes('clash'))
    assert.ok(adultSupport?.body.includes('Staff checked in'))
    assert.ok(childVoice?.body.includes('okay'))
  })

  it('detects [NAME_1] and registered manager in people panel', () => {
    const people = buildPeopleToConfirm(SUPERVISION_INTRO)
    assert.ok(people.some((item) => item.label === '[NAME_1]'))
    assert.ok(
      people.some(
        (item) =>
          item.role === 'registered_manager' ||
          item.detail?.includes('registered manager role mentioned')
      )
    )
    assert.ok(!people.every((item) => /^Speaker \d+$/i.test(item.label)))
  })

  it('detects Tom Kelly from my name is phrase', () => {
    const people = buildPeopleToConfirm('My name is Tom Kelly. I am the registered manager.')
    assert.ok(people.some((item) => item.label === 'Tom Kelly'))
  })

  it('unmapped scaffold is detectable separately from mapped document', () => {
    const empty = buildInitialWorkingDocument('', 'daily_record')
    assert.equal(isWorkingDocumentUnmappedScaffold(empty), true)
    const mapped = buildInitialWorkingDocument(FOOTBALL_DAILY, 'daily_record')
    assert.equal(isWorkingDocumentUnmappedScaffold(mapped), false)
  })
})
