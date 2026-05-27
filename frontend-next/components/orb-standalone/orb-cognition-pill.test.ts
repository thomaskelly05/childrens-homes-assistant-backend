import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cognitionPillLabel,
  collectCognitionDisplayLabels,
  inferResidentialCognitionLabels,
  isAutomaticRoutingOnlyLabel
} from '../../lib/orb/residential-agents.ts'

describe('cognitionPillLabel', () => {
  it('uses backend cognition_display_labels for residential prompts', () => {
    const label = cognitionPillLabel('Ask ORB', {
      cognition_display_labels: ['Medication / health', 'Recording quality', 'Leadership oversight']
    })
    assert.equal(label, 'Medication / health · Recording quality · Leadership oversight')
    assert.equal(isAutomaticRoutingOnlyLabel(label), false)
  })

  it('does not show only Automatic routing for residential message hints', () => {
    const label = cognitionPillLabel('Ask ORB', {}, 'Medication was missed this morning')
    assert.notEqual(label, 'Automatic routing')
    assert.equal(isAutomaticRoutingOnlyLabel(label), false)
    assert.match(label, /Medication \/ health/)
  })

  it('may show Automatic routing for non-residential general questions', () => {
    const label = cognitionPillLabel('Ask ORB', {}, 'Explain quantum entanglement')
    assert.equal(label, 'Automatic routing')
  })

  it('filters Ofsted Lens from Ask ORB auto labels', () => {
    const label = cognitionPillLabel('Ask ORB', {
      cognition_display_labels: ['Safeguarding', 'Ofsted Lens', 'Recording quality']
    })
    assert.match(label, /Safeguarding/)
    assert.doesNotMatch(label, /Ofsted Lens/)
  })

  it('renders medication pill labels from context_used when explainability is empty', () => {
    const label = cognitionPillLabel(
      'Ask ORB',
      {},
      'Medication was missed this morning',
      {
        context_used: {
          cognition_display_labels: ['Medication / health', 'Recording quality', 'Leadership oversight']
        }
      }
    )
    assert.equal(label, 'Medication / health · Recording quality · Leadership oversight')
  })

  it('renders cumulative concern inferred labels before missing-only routing', () => {
    const prompt =
      'A young person has made three allegations in two months, two missing episodes, and there have been four restraints involving the same staff member'
    assert.equal(
      cognitionPillLabel('Ask ORB', {}, prompt),
      'Safeguarding · Professional curiosity · Leadership oversight · Ofsted evidence'
    )
  })

  it('renders missing and therapeutic inferred labels', () => {
    assert.equal(
      cognitionPillLabel('Ask ORB', {}, 'A young person went missing overnight'),
      'Missing from home · Safeguarding · Recording quality · Ofsted evidence'
    )
    assert.equal(
      cognitionPillLabel(
        'Ask ORB',
        {},
        'Family time was cancelled and the child smashed a cup — help me think therapeutically'
      ),
      'Therapeutic reflection · Recording quality · Child experience'
    )
  })
})

describe('collectCognitionDisplayLabels', () => {
  it('prefers context_used cognition_display_labels over inference', () => {
    const labels = collectCognitionDisplayLabels(
      {},
      {
        context_used: {
          cognition_display_labels: ['Medication / health', 'Recording quality', 'Leadership oversight']
        }
      },
      'unrelated text'
    )
    assert.deepEqual(labels, ['Medication / health', 'Recording quality', 'Leadership oversight'])
  })

  it('infers residential labels when backend fields are missing', () => {
    assert.deepEqual(inferResidentialCognitionLabels('Medication was missed this morning'), [
      'Medication / health',
      'Recording quality',
      'Leadership oversight'
    ])
  })
})
