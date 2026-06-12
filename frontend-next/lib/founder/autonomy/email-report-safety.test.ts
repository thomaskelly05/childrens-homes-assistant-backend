import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { containsRealChildData, sanitizeEmailReportSections } from './email-report-safety.ts'

describe('Email report safety checker', () => {
  it('allows synthetic scenario summaries and disclaimer lines', () => {
    const sections = {
      internalBrain: [
        '• syn-pack-001: 95% pass, 0 critical, status completed [synthetic evaluation run]',
        '• Internal Brain Quick Safety Check: 100% pass rate'
      ],
      tomApproval: ['No items awaiting Tom approval.']
    }

    const result = sanitizeEmailReportSections(sections)
    assert.equal(result.status, 'passed')
    assert.equal(result.redactionCount, 0)
    assert.equal(result.noRealChildDataConfirmed, true)
  })

  it('does not false-positive on "No real child data" disclaimer', () => {
    const text = ['Synthetic evidence only.', 'No real child data.', 'Confirmed: no real child data in this preview.'].join(
      '\n'
    )
    assert.equal(containsRealChildData(text), false)
  })

  it('allows generic "young person" references without names', () => {
    const sections = {
      summary: ['Coverage includes young person safeguarding scenarios at high level.', '3 scenarios passed.']
    }
    const result = sanitizeEmailReportSections(sections)
    assert.equal(result.status, 'passed')
  })

  it('blocks obvious real child data with DOB', () => {
    const sections = {
      caseDetail: ['DOB: 12/03/2010', 'Notes about placement']
    }
    const result = sanitizeEmailReportSections(sections)
    assert.ok(result.redactionCount >= 1)
    assert.ok(result.status === 'redacted' || result.status === 'blocked')
  })

  it('redacts unsafe section instead of crashing when possible', () => {
    const sections = {
      finance: ['Monthly burn (estimated): £5000'],
      evaluationSummary: ['Young person named Sarah attended review meeting with detailed case notes about home placement.']
    }

    const result = sanitizeEmailReportSections(sections)
    assert.ok(result.redactionCount >= 1)
    assert.equal(result.sanitizedSections.finance[0], 'Monthly burn (estimated): £5000')
    assert.match(result.sanitizedSections.evaluationSummary[0] ?? '', /redacted/i)
    assert.notEqual(result.status, 'passed')
  })

  it('blocks report when critical data appears in multiple sections', () => {
    const sections = {
      sectionA: ['DOB: 01/01/2010'],
      sectionB: ['NHS number: 943 476 5919']
    }
    const result = sanitizeEmailReportSections(sections)
    assert.equal(result.status, 'blocked')
    assert.ok(result.blockedReason)
  })
})
