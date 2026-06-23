import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE,
  isMockProviderLeakage,
  sanitizeUserVisibleProviderAnswer
} from './orb-provider-user-answer.ts'

describe('orb-provider-user-answer', () => {
  it('detects mock leakage patterns', () => {
    assert.equal(isMockProviderLeakage('ORB mock engine response. Configure OPENAI_API_KEY'), true)
    assert.equal(isMockProviderLeakage('Calm breakfast record.'), false)
  })

  it('sanitizes mock text in staging context', () => {
    const prev = process.env.NEXT_PUBLIC_ENVIRONMENT
    process.env.NEXT_PUBLIC_ENVIRONMENT = 'staging'
    try {
      const cleaned = sanitizeUserVisibleProviderAnswer(
        'ORB mock engine response. Configure OPENAI_API_KEY for live answers.',
        { provider: 'mock', signOffContext: true }
      )
      assert.equal(cleaned, ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE)
    } finally {
      process.env.NEXT_PUBLIC_ENVIRONMENT = prev
    }
  })
})
