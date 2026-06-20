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
      className="orb-guided-demo-entry--premium mt-4 w-full max-w-[var(--orb-composer-max,46rem)] rounded-2xl border p-4 text-left shadow-sm backdrop-blur-sm md:p-5"
      data-orb-guided-demo-entry
    >
      <div className="flex items-start gap-3.5">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--orb-primary)]/20 to-sky-400/15 text-[var(--orb-primary)] shadow-inner"
          aria-hidden
        >
          <Compass className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Provider walkthrough
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900" data-orb-guided-demo-entry-title>
            {ORB_GUIDED_DEMO_LABEL}
          </h3>
          <p
            className="mt-1.5 text-xs leading-relaxed text-[var(--orb-muted)] md:text-sm"
            data-orb-guided-demo-entry-subline
          >
            {ORB_GUIDED_DEMO_ENTRY_SUBLINE}
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-3.5 inline-flex min-h-[2.65rem] items-center justify-center rounded-full bg-[var(--orb-primary)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95"
            data-orb-guided-demo-start
          >
            {ORB_GUIDED_DEMO_LABEL}
          </button>
          <p className="mt-2.5 text-xs text-[var(--orb-muted)]">
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
