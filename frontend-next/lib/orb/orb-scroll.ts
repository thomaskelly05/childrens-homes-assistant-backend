/** Distance from bottom (px) within which auto-scroll stays enabled during streaming. */
export const ORB_SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 120

export function isOrbScrollNearBottom(
  container: HTMLElement | null,
  thresholdPx = ORB_SCROLL_NEAR_BOTTOM_THRESHOLD_PX
): boolean {
  if (!container) return true
  const distance = container.scrollHeight - container.scrollTop - container.clientHeight
  return distance <= thresholdPx
}

export function scrollOrbToBottom(
  endElement: HTMLElement | null,
  options?: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition }
): void {
  if (!endElement) return
  endElement.scrollIntoView({
    behavior: options?.behavior ?? 'auto',
    block: options?.block ?? 'end'
  })
}

export function orbScrollBehaviorForReducedMotion(): ScrollBehavior {
  if (typeof window === 'undefined') return 'smooth'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** Whether the scroll-to-bottom FAB should show (user scrolled up with content below). */
export function shouldShowOrbScrollFab(options: {
  nearBottom: boolean
  hasMessages: boolean
  isStreaming: boolean
}): boolean {
  if (options.nearBottom) return false
  return options.hasMessages || options.isStreaming
}
