import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  deferComposerOutsidePointerArm,
  shouldDismissComposerAttachmentMenu
} from './orb-composer-outside-click.ts'

function mockEvent(target: EventTarget | null, path?: EventTarget[]): Event {
  return {
    target,
    composedPath() {
      return path ?? (target ? [target] : [])
    }
  } as Event
}

describe('orb composer attachment outside click', () => {
  it('ignores taps on plus button via composedPath', () => {
    const button = { closest: (sel: string) => (sel.includes('plus-button') ? button : null) } as unknown as Element
    const icon = { closest: (sel: string) => (sel.includes('plus-button') ? button : null) } as unknown as Element
    const event = mockEvent(icon, [icon, button, {} as EventTarget])
    assert.equal(shouldDismissComposerAttachmentMenu(event, { armed: true }), false)
  })

  it('ignores taps on attachment menu and backdrop', () => {
    const menu = {
      closest: (sel: string) => (sel.includes('attachment-menu') ? menu : null)
    } as unknown as Element
    const event = mockEvent(menu, [menu, {} as EventTarget])
    assert.equal(shouldDismissComposerAttachmentMenu(event, { armed: true }), false)
  })

  it('dismisses when armed and outside attachment UI', () => {
    const outside = { closest: () => null } as unknown as Element
    const event = mockEvent(outside, [outside, {} as EventTarget])
    assert.equal(shouldDismissComposerAttachmentMenu(event, { armed: true }), true)
  })

  it('does not dismiss before outside listener is armed', () => {
    const outside = { closest: () => null } as unknown as Element
    const event = mockEvent(outside, [outside, {} as EventTarget])
    assert.equal(shouldDismissComposerAttachmentMenu(event, { armed: false }), false)
  })

  it('defer arm becomes true after double rAF', async () => {
    const originalRaf = globalThis.requestAnimationFrame
    const originalCancel = globalThis.cancelAnimationFrame
    let frame = 0
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      frame += 1
      const id = frame
      queueMicrotask(() => cb(0))
      return id
    }
    globalThis.cancelAnimationFrame = () => undefined

    try {
      const guard = deferComposerOutsidePointerArm()
      assert.equal(guard.isArmed(), false)
      guard.arm()
      await new Promise((resolve) => setTimeout(resolve, 0))
      assert.equal(guard.isArmed(), true)
      guard.disarm()
      assert.equal(guard.isArmed(), false)
    } finally {
      globalThis.requestAnimationFrame = originalRaf
      globalThis.cancelAnimationFrame = originalCancel
    }
  })
})
