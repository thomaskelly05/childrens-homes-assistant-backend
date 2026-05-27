import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cognitionPillLabel, isAutomaticRoutingOnlyLabel } from '../../lib/orb/residential-agents.ts'

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
})
