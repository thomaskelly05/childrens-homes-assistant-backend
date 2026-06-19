'use client'

import { Compass } from 'lucide-react'

import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import {
  ORB_GUIDED_DEMO_ENTRY_SUBLINE,
  ORB_GUIDED_DEMO_LABEL
} from '@/lib/orb/orb-guided-demo'

type OrbGuidedDemoEntryProps = {
  onStart: () => void
}

/** Single Guided Demo entry on Home — not duplicated elsewhere on the empty state. */
export function OrbGuidedDemoEntry({ onStart }: OrbGuidedDemoEntryProps) {
  return (
    <div
      className="mt-4 w-full max-w-[var(--orb-composer-max,46rem)] rounded-2xl border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/40 p-4 text-left shadow-sm backdrop-blur-sm md:p-5"
      data-orb-guided-demo-entry
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--orb-primary)]/12 text-[var(--orb-primary)]"
          aria-hidden
        >
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-guided-demo-entry-title>
            {ORB_GUIDED_DEMO_LABEL}
          </h3>
          <p
            className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)] md:text-sm"
            data-orb-guided-demo-entry-subline
          >
            {ORB_GUIDED_DEMO_ENTRY_SUBLINE}
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-3 inline-flex min-h-[2.5rem] items-center justify-center rounded-full bg-[var(--orb-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            data-orb-guided-demo-start
          >
            {ORB_GUIDED_DEMO_LABEL}
          </button>
          <p className="mt-2 text-xs text-[var(--orb-muted)]">
            <OrbRequestDemoLink
              surface="home"
              className="font-medium text-[var(--orb-primary)] underline-offset-2 hover:underline"
            />
          </p>
        </div>
      </div>
    </div>
  )
}
