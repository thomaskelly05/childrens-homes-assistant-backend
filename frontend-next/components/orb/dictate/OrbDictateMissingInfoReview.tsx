'use client'

import { buildDictateMissingInfoReview, type OrbDictateIntelligenceRequest } from '@/lib/orb/dictate/orb-dictate-intelligence'

export function OrbDictateMissingInfoReview({
  request
}: {
  request: OrbDictateIntelligenceRequest
}) {
  const items = buildDictateMissingInfoReview(request)
  if (!items.length) return null

  return (
    <div
      className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2.5"
      data-orb-dictate-missing-info-review
    >
      <p className="text-xs font-semibold text-amber-950">Before final draft, check:</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs leading-relaxed text-amber-950/90" data-orb-dictate-missing-info-item>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
