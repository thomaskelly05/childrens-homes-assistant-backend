import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ensureMaxOldSpaceSize } from './render-safe-next-build.mjs'

describe('render-safe-next-build', () => {
  it('appends max-old-space-size when missing', () => {
    assert.equal(ensureMaxOldSpaceSize(''), '--max-old-space-size=4096')
    assert.equal(ensureMaxOldSpaceSize('   '), '--max-old-space-size=4096')
    assert.equal(
      ensureMaxOldSpaceSize('--expose-gc'),
      '--expose-gc --max-old-space-size=4096'
    )
  })

  it('does not duplicate when max-old-space-size is already present', () => {
    assert.equal(
      ensureMaxOldSpaceSize('--max-old-space-size=4096'),
      '--max-old-space-size=4096'
    )
    assert.equal(
      ensureMaxOldSpaceSize('--max-old-space-size=1536'),
      '--max-old-space-size=1536'
    )
    assert.equal(
      ensureMaxOldSpaceSize('--expose-gc --max-old-space-size=2048'),
      '--expose-gc --max-old-space-size=2048'
    )
  })
})
