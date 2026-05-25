'use client'

import Link from 'next/link'

import type { InspectionEvidenceGap } from '@/lib/os-api/inspection-readiness'

type Props = { gap: InspectionEvidenceGap }

export function InspectionGapCard({ gap }: Props) {
  return (
    <article
      data-testid={`inspection-gap-${gap.id}`}
      className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4"
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">Potential gap</p>
      <h4 className="mt-1 text-sm font-black text-amber-950">{gap.title}</h4>
      <p className="mt-2 text-xs leading-6 text-amber-900/90">{gap.description}</p>
      {gap.recommended_action ? (
        <p className="mt-2 text-xs font-semibold text-amber-950">{gap.recommended_action}</p>
      ) : null}
      <Link href={gap.route} className="mt-3 inline-flex text-xs font-black text-amber-900 hover:underline">
        {gap.action_label || 'Review'}
      </Link>
    </article>
  )
}
