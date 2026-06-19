import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  displayLabelForSavedOutput,
  isForbiddenOutputStatusLabel
} from '../../lib/orb/orb-output-types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readComponent(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8')
}

describe('orb saved outputs adapters', () => {
  it('create body metadata includes needs_review review_status', () => {
    const adapters = readComponent('../../lib/orb/orb-saved-output-adapters.ts')
    assert.match(adapters, /buildOutputReviewMetadata\('needs_review'\)/)
    assert.match(adapters, /savedOutputReviewStatusLabel/)
    assert.match(adapters, /displayLabelForSavedOutput/)
  })

  it('export markdown includes review status line', () => {
    const adapters = readComponent('../../lib/orb/orb-saved-output-adapters.ts')
    assert.match(adapters, /\*\*Review status:\*\* \$\{reviewLabel\}/)
  })

  it('maps saved backend status to Needs review for display', () => {
    assert.equal(displayLabelForSavedOutput('saved'), 'Needs review')
    assert.equal(displayLabelForSavedOutput('saved', {}), 'Needs review')
    assert.equal(
      displayLabelForSavedOutput('saved', { review_status: 'reviewed_by_adult' }),
      'Reviewed by adult'
    )
  })

  it('never uses forbidden approval labels in display mapping', () => {
    assert.equal(isForbiddenOutputStatusLabel('Approved by ORB'), true)
    assert.notEqual(displayLabelForSavedOutput('saved', { review_status: 'Approved by ORB' }), 'Approved by ORB')
  })
})

describe('orb saved outputs panel UI', () => {
  it('panel renders list, detail, review status and empty state hooks', () => {
    const panel = readComponent('orb-saved-outputs-panel.tsx')
    const actions = readComponent('orb-saved-output-detail-actions.tsx')
    assert.match(panel, /Saved Outputs/)
    assert.match(panel, /Reuse, export and improve your ORB work/)
    assert.match(panel, /data-orb-saved-outputs-list/)
    assert.match(panel, /data-orb-saved-output-detail/)
    assert.match(panel, /data-orb-saved-output-review-status/)
    assert.match(panel, /savedOutputReviewStatusLabel/)
    assert.match(panel, /Nothing saved yet/)
    assert.match(actions, /data-orb-saved-output-copy/)
    assert.match(actions, /data-orb-saved-output-export/)
    assert.match(actions, /data-orb-saved-output-ask-orb/)
    assert.match(actions, /data-orb-saved-output-send-dictate/)
    assert.match(actions, /data-orb-saved-output-shift-builder/)
    assert.match(actions, /data-orb-saved-output-rerun-unavailable/)
  })

  it('save actions include ask orb, boundary copy and review notice', () => {
    const save = readComponent('orb-output-save-actions.tsx')
    assert.match(save, /data-orb-save-output/)
    assert.match(save, /Ask ORB about this/)
    assert.match(save, /needs adult review/)
    assert.match(save, /ORB_SAVED_OUTPUT_BOUNDARY_LINES/)
  })
})
