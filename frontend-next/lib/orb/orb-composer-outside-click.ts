import { shouldIgnoreComposerFocusTarget } from './orb-composer-focus-guard.ts'

/** Regions that belong to the mobile attachment menu or its trigger — never dismiss on these taps. */
export const ORB_COMPOSER_ATTACHMENT_UI_SELECTOR = [
  '[data-orb-composer-plus-button]',
  '[data-orb-composer-plus-trigger]',
  '[data-orb-composer-tools-trigger]',
  '[data-orb-composer-action-rail]',
  '[data-orb-composer-attach-anchor]',
  '[data-orb-composer-attachment-menu]',
  '[data-orb-composer-attach-backdrop]',
  '[data-orb-composer-attach-sheet]',
  '[data-orb-composer-tools-sheet]'
].join(',')

function nodeInAttachmentUi(node: EventTarget | null): boolean {
  if (!node || typeof node !== 'object') return false
  const el = node as { closest?: (selector: string) => unknown }
  if (typeof el.closest !== 'function') return false
  return Boolean(el.closest(ORB_COMPOSER_ATTACHMENT_UI_SELECTOR))
}

/** Whether a pointer event should dismiss the portaled attachment menu. */
export function shouldDismissComposerAttachmentMenu(
  event: Event,
  options?: { armed?: boolean }
): boolean {
  if (options?.armed === false) return false
  if (typeof event.composedPath === 'function') {
    for (const node of event.composedPath()) {
      if (nodeInAttachmentUi(node)) return false
    }
    return true
  }
  return !shouldIgnoreComposerFocusTarget(event.target) && !nodeInAttachmentUi(event.target)
}

export function deferComposerOutsidePointerArm(): {
  arm: () => void
  disarm: () => void
  isArmed: () => boolean
} {
  let armed = false
  let frameId = 0
  return {
    arm() {
      if (typeof window === 'undefined') {
        armed = true
        return
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          armed = true
        })
      })
    },
    disarm() {
      armed = false
      if (typeof window !== 'undefined' && frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    },
    isArmed: () => armed
  }
}

/** @deprecated Re-export for tests — prefer shouldDismissComposerAttachmentMenu */
export { ORB_COMPOSER_FOCUS_IGNORE_SELECTOR } from './orb-composer-focus-guard.ts'
