import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  __founderApiClientTestState,
  clearFounderApiClientCache
} from '../api/founder-api-client.ts'

describe('founder-api-client dedupe', () => {
  it('tracks in-flight GET dedupe state helpers', () => {
    clearFounderApiClientCache()
    const state = __founderApiClientTestState()
    assert.equal(state.inFlightCount, 0)
    assert.equal(state.cacheSize, 0)
  })
})
