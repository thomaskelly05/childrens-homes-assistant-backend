'use client'

import { ORB_DICTATE_GOVERNANCE_COPY } from '@/lib/orb/dictate/orb-dictate-types'
import { SPEAKER_BOUNDARY_COPY } from '@/lib/orb/dictate/orb-dictate-speaker'

export function OrbDictateBoundaryCopy({
  compact = false,
  collapsible = false
}: {
  compact?: boolean
  collapsible?: boolean
}) {
  const body = (
    <>
      <p data-orb-dictate-boundary-based-on-input>{ORB_DICTATE_GOVERNANCE_COPY.basedOnInput}</p>
      <p data-orb-dictate-boundary-review>{ORB_DICTATE_GOVERNANCE_COPY.reviewBeforeShare}</p>
      <p data-orb-dictate-boundary-no-live-records>{ORB_DICTATE_GOVERNANCE_COPY.noLiveRecords}</p>
      {!compact ? (
        <>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.boundary}</p>
          <p data-orb-dictate-speaker-boundary>{SPEAKER_BOUNDARY_COPY}</p>
        </>
      ) : null}
    </>
  )

  if (collapsible) {
    return (
      <details className="mt-2 text-left" data-orb-dictate-boundary-disclosure>
        <summary className="cursor-pointer text-xs font-medium text-[var(--orb-muted)]">
          Privacy &amp; responsibility
        </summary>
        <aside className="mt-2 space-y-1 text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-dictate-boundary-copy>
          {body}
        </aside>
      </details>
    )
  }

  const className = compact
    ? 'space-y-1 text-[10px] text-[var(--orb-muted)]'
    : 'space-y-1 text-[10px] text-[var(--orb-muted)]'
  return (
    <aside className={className} data-orb-dictate-boundary-copy>
      {body}
    </aside>
  )
}
