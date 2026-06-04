'use client'

import { useEffect, useState } from 'react'

import { intelligenceMicroStatusForDepth } from '@/lib/orb/indicare-intelligence-core'

/** Subtle rotating micro-status while residential+ answers are prepared. */
export function OrbIntelligenceMicroStatus({
  active,
  expertDepth
}: {
  active: boolean
  expertDepth?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }
    const timer = window.setInterval(() => setIndex((i) => i + 1), 2200)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active) return null

  const message = intelligenceMicroStatusForDepth(expertDepth, index)
  if (!message) return null

  return (
    <p
      className="orb-intelligence-micro-status px-4 py-1 text-center text-[11px] text-[var(--orb-muted)]"
      data-orb-intelligence-micro-status
      data-orb-intelligence-micro-status-depth={expertDepth || 'general_light'}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  )
}
