'use client'

import { ChevronDown } from 'lucide-react'

export function OrbScrollToBottomFab({
  visible,
  streaming,
  reducedMotion,
  onClick
}: {
  visible: boolean
  streaming?: boolean
  reducedMotion?: boolean
  onClick: () => void
}) {
  if (!visible) return null

  const label = streaming ? 'New response' : 'Scroll to latest message'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`orb-scroll-to-bottom-fab ${streaming && !reducedMotion ? 'orb-scroll-to-bottom-fab--pulse' : ''}`}
      aria-label="Scroll to latest message"
      title={label}
      data-orb-scroll-to-bottom
      data-orb-scroll-fab-streaming={streaming ? 'true' : 'false'}
    >
      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
      {streaming ? <span className="orb-scroll-to-bottom-fab__label">New response</span> : null}
    </button>
  )
}
