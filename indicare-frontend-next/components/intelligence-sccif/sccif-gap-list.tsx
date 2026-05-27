'use client'

import Link from 'next/link'

import type { SccifEvidenceGap } from '@/lib/os-api/sccif-alignment'

type Props = {
  gaps: SccifEvidenceGap[]
}

export function SccifGapList({ gaps }: Props) {
  return (
    <section data-testid="sccif-gap-list" className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Evidence gaps</h2>
      <p className="text-xs font-semibold text-slate-600">
        Potential gaps — not a compliance decision. Professional judgement remains required.
      </p>
      {!gaps.length ? (
        <p className="text-sm font-semibold text-slate-600">No gaps identified in current scope.</p>
      ) : (
        <ul className="space-y-3">
          {gaps.map((gap) => (
            <li
              key={gap.id}
              data-testid={`sccif-gap-${gap.id}`}
              className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3"
            >
              <p className="text-sm font-black text-amber-950">{gap.title}</p>
              <p className="mt-1 text-xs leading-6 text-amber-900/90">{gap.description}</p>
              {gap.recommended_action ? (
                <p className="mt-2 text-xs font-semibold text-slate-700">{gap.recommended_action}</p>
              ) : null}
              <Link
                href={gap.route}
                className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 underline"
              >
                {gap.action_label || 'Take action'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
