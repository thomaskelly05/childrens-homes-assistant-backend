import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  displayLabelForSavedOutput,
  isForbiddenOutputStatusLabel,
  ORB_FORBIDDEN_OUTPUT_STATUS_LABELS,
  orbOutputReviewStatusLabel,
  readOutputReviewStatus
} from './orb-output-types.ts'

describe('orb-output-types', () => {
  it('rejects forbidden overclaim labels', () => {
    assert.equal(isForbiddenOutputStatusLabel('Approved by ORB'), true)
    assert.equal(isForbiddenOutputStatusLabel('Ofsted guaranteed'), true)
    assert.equal(isForbiddenOutputStatusLabel('Needs review'), false)
  })

  it('never surfaces forbidden labels through display mapping', () => {
    for (const forbidden of ORB_FORBIDDEN_OUTPUT_STATUS_LABELS) {
      assert.equal(isForbiddenOutputStatusLabel(forbidden), true)
      assert.notEqual(displayLabelForSavedOutput('saved', { review_status: forbidden }), forbidden)
      assert.equal(orbOutputReviewStatusLabel(forbidden), 'Needs review')
    }
  })

  it('maps backend saved status to needs review', () => {
    assert.equal(displayLabelForSavedOutput('saved'), 'Needs review')
    assert.equal(displayLabelForSavedOutput('pinned'), 'Needs review')
    assert.equal(displayLabelForSavedOutput('draft'), 'Draft')
    assert.equal(displayLabelForSavedOutput('archived'), 'Archived')
  })

  it('falls back safely when metadata.review_status is missing', () => {
    assert.equal(displayLabelForSavedOutput('saved', undefined), 'Needs review')
    assert.equal(displayLabelForSavedOutput('saved', {}), 'Needs review')
    assert.equal(displayLabelForSavedOutput('draft', {}), 'Draft')
  })

  it('prefers metadata.review_status over backend saved status', () => {
    assert.equal(
      displayLabelForSavedOutput('saved', { review_status: 'reviewed_by_adult' }),
      'Reviewed by adult'
    )
    assert.equal(
      displayLabelForSavedOutput('saved', { review_status: 'manager_reviewed' }),
      'Manager reviewed'
    )
  })

  it('reads review_status from metadata', () => {
    assert.equal(
      readOutputReviewStatus({ review_status: 'reviewed_by_adult' }),
      'reviewed_by_adult'
    )
    assert.equal(orbOutputReviewStatusLabel('reviewed_by_adult'), 'Reviewed by adult')
  })
})
