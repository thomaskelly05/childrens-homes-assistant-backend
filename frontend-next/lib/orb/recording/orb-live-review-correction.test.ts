import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  applyAdultIdentityLanguage,
  buildAdultIdentityPromptBlock,
  extractSuppliedAdultInitials,
  isDailyRecordRequest,
  isIncidentRecordRequest,
  isSelfCommentaryParagraph,
  sanitizeObservationInterpretationLanguage
} from './orb-adult-identity-language.ts'
import { buildSectionPromptBody } from './orb-recording-section-prompts.ts'
import { buildTherapeuticWritingPromptBlock } from './orb-therapeutic-writing.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const workspaceRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const DAILY_RECORD_PROMPT =
  "Create a daily record from the following rough notes. Child A came back quieter than usual. Staff gave them space."

describe('ORB live review correction pass', () => {
  it('detects daily vs incident record requests', () => {
    assert.equal(isDailyRecordRequest(DAILY_RECORD_PROMPT), true)
    assert.equal(isIncidentRecordRequest(DAILY_RECORD_PROMPT), false)
    assert.equal(isIncidentRecordRequest('Create an incident reflection from these notes'), true)
  })

  it('applies adult identity without inventing initials', () => {
    const cleaned = applyAdultIdentityLanguage('Staff gave Child A space and checked in later.')
    assert.match(cleaned, /The adult gave Child A space/i)
    assert.doesNotMatch(cleaned, /Adult [A-Z]{1,3}/)
  })

  it('retains supplied Adult TK / Adult JS labels', () => {
    const source = 'Adult TK gave Child A space. Adult JS checked in later. Staff offered toast.'
    assert.deepEqual(extractSuppliedAdultInitials(source), ['TK', 'JS'])
    const cleaned = applyAdultIdentityLanguage(source, ['TK', 'JS'])
    assert.match(cleaned, /Adult TK/)
    assert.match(cleaned, /Adult JS/)
    assert.doesNotMatch(cleaned, /\bStaff\b/)
  })

  it('sanitizes mood improved and seemed relaxed wording', () => {
    const cleaned = sanitizeObservationInterpretationLanguage(
      'By evening mood improved and Child A seemed relaxed.'
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /mood improved/)
    assert.doesNotMatch(cleaned.toLowerCase(), /seemed relaxed/)
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
    assert.match(cleaned.toLowerCase(), /appeared more settled/)
  })

  it('flags self-commentary after records', () => {
    assert.equal(
      isSelfCommentaryParagraph(
        'This record maintains a factual, child-centred approach and uses therapeutic language throughout.'
      ),
      true
    )
    assert.equal(isSelfCommentaryParagraph('Daily Record\n\nChild A appeared quieter after school.'), false)
  })

  it('daily record section prompts avoid Incident Summary headings', () => {
    const body = buildSectionPromptBody('daily_record') ?? ''
    assert.match(body, /## Daily Record/)
    assert.match(body, /## Presentation and Support/)
    assert.match(body, /## Adult Response/)
    assert.doesNotMatch(body, /^## Incident Summary/mi)
    assert.doesNotMatch(body, /^## Incident\b/mi)
  })

  it('therapeutic writing prompt block includes adult identity discipline', () => {
    const block = buildTherapeuticWritingPromptBlock('daily_record').toLowerCase()
    assert.match(block, /do not default to 'staff'/)
    assert.match(block, /do not add a self-assessment|no self-commentary/)
    assert.match(block, /appeared calmer/)
  })

  it('frontend and backend framework versions remain aligned', () => {
    const frontend = JSON.parse(read('lib/orb/recording/orb-recording-framework.json'))
    const backend = JSON.parse(
      readFileSync(join(workspaceRoot, 'assistant/knowledge/orb_recording_framework.json'), 'utf8')
    )
    assert.equal(frontend.version, backend.version)
    const daily = frontend.record_types.find((row: { id: string }) => row.id === 'daily_record')
    assert.ok(daily.final_document_headings.includes('Daily Record'))
    assert.ok(!daily.final_document_headings.join(' ').match(/Incident Summary/i))
  })

  it('adult identity prompt includes examples and heading discipline', () => {
    const block = buildAdultIdentityPromptBlock()
    assert.match(block, /Adult TK gave Child A space/)
    assert.match(block, /Incident Summary/)
    assert.match(block, /Outcome \/ Handover/)
  })
})
