'use client'

import Link from 'next/link'

import type { InspectionEvidenceItem } from '@/lib/os-api/inspection-readiness'

type Props = { item: InspectionEvidenceItem }

export function InspectionEvidenceCard({ item }: Props) {
  const isDraft = item.evidence_strength === 'draft_only' || item.evidence_strength === 'prompt_only'
  return (
    <article
      data-testid={`inspection-evidence-${item.id}`}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-black text-slate-950">{item.title}</h4>
        {isDraft ? (
          <span
            data-testid="inspection-draft-only-badge"
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800"
          >
            Draft-only
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-600">{item.safe_summary}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {item.source_module} · {item.evidence_strength.replace(/_/g, ' ')}
      </p>
      {item.route ? (
        <Link
          href={item.route}
          className="mt-3 inline-flex text-xs font-black text-blue-700 hover:underline"
        >
          {item.action_label || 'Open source'}
        </Link>
      ) : null}
    </article>
  )
}
