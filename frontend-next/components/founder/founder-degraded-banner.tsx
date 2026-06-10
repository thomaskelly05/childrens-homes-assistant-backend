'use client'

import { AlertTriangle } from 'lucide-react'

import { FOUNDER_BUSY_MESSAGE } from '@/lib/founder/bootstrap/founder-bootstrap-client'

type FounderDegradedBannerProps = {
  show?: boolean
  message?: string
}

export function FounderDegradedBanner({
  show = false,
  message = FOUNDER_BUSY_MESSAGE
}: FounderDegradedBannerProps) {
  if (!show) return null

  return (
    <div
      className="mx-auto mb-4 max-w-[1200px] rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <p>{message}</p>
      </div>
    </div>
  )
}
