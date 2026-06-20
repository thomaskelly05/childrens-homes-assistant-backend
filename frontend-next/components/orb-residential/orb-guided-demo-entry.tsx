'use client'

import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import { ORB_GUIDED_DEMO_LABEL } from '@/lib/orb/orb-guided-demo'

type OrbGuidedDemoEntryProps = {
  onStart: () => void
}

/** Subtle Guided Demo entry — link only, not a card. */
export function OrbGuidedDemoEntry({ onStart }: OrbGuidedDemoEntryProps) {
  return (
    <p className="orb-guided-demo-entry mt-2 text-center text-xs text-[var(--orb-muted)]" data-orb-guided-demo-entry>
      <button
        type="button"
        onClick={onStart}
        className="font-medium text-[var(--orb-primary)] underline-offset-2 hover:underline"
        data-orb-guided-demo-start
      >
        {ORB_GUIDED_DEMO_LABEL}
      </button>
      <span className="mx-1.5 opacity-40" aria-hidden>
        ·
      </span>
      <OrbRequestDemoLink
        surface="home"
        className="font-medium text-[var(--orb-primary)] underline-offset-2 hover:underline"
      />
    </p>
  )
}
