import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildOrbReviewPrompt } from './orb-review-prompt.ts'

describe('buildOrbReviewPrompt', () => {
  it('includes therapeutic context and output sections', () => {
    const prompt = buildOrbReviewPrompt({
      text: 'Sample record text',
      therapeuticContext: 'Young person was dysregulated after contact.',
      chips: ['trauma_informed', 'strengths_based'],
      professionalTone: 'therapeutic'
    })
    assert.match(prompt, /Therapeutic interpretation/)
    assert.match(prompt, /Young person was dysregulated/)
    assert.match(prompt, /trauma-informed/i)
    assert.match(prompt, /professional judgement/i)
    assert.match(prompt, /Sample record text/)
  })
})
