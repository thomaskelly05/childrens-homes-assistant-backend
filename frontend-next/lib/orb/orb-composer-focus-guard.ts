/** Interactive regions that must not trigger composer text focus on tap. */
export const ORB_COMPOSER_FOCUS_IGNORE_SELECTOR = [
  'button',
  'input',
  'textarea',
  'a',
  '[role="button"]',
  '[data-orb-composer-plus-button]',
  '[data-orb-composer-plus-trigger]',
  '[data-orb-composer-tools-trigger]',
  '[data-orb-composer-action-rail]',
  '[data-orb-composer-send-rail]',
  '[data-orb-composer-attachment-menu]',
  '[data-orb-composer-attach-backdrop]',
  '[data-orb-composer-attach-sheet]',
  '[data-orb-composer-tools-sheet]',
  '[data-orb-privacy-guidance-trigger]'
].join(',')

export function shouldIgnoreComposerFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest(ORB_COMPOSER_FOCUS_IGNORE_SELECTOR))
}
