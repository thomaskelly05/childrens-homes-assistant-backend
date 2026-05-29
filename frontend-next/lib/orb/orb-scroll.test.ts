import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isOrbScrollNearBottom, ORB_SCROLL_NEAR_BOTTOM_THRESHOLD_PX } from './orb-scroll.ts'

describe('orb scroll helpers', () => {
  it('treats bottom of container as near bottom', () => {
    const container = {
      scrollHeight: 1000,
      scrollTop: 880,
      clientHeight: 100
    } as HTMLElement
    assert.equal(isOrbScrollNearBottom(container), true)
  })

  it('treats scrolled up as not near bottom', () => {
    const container = {
      scrollHeight: 1000,
      scrollTop: 100,
      clientHeight: 100
    } as HTMLElement
    assert.equal(isOrbScrollNearBottom(container), false)
  })

  it('exports sensible default threshold', () => {
    assert.ok(ORB_SCROLL_NEAR_BOTTOM_THRESHOLD_PX >= 80)
  })
})
