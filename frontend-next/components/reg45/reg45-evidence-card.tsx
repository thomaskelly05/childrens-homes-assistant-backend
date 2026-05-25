'use client'

import Link from 'next/link'

import type { Reg45ReviewEvidenceItem } from '@/lib/os-api/reg45-quality-review'

type Props = { item: Reg45ReviewEvidenceItem }

export function Reg45EvidenceCard({ item }: Props) {
  const draft =
    item.evidence_strength === 'draft_only' || item.evidence_strength === 'prompt_only' ? 'Draft only' : null
  return (
    <article
      data-testid="reg45-evidence-card"
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-black text-slate-950">{item.title}</h4>
        {draft ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
            {draft}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">{item.safe_summary}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        Evidence reviewed · {item.source_module}
      </p>
      {item.route ? (
        <Link
          href={item.route}
          className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.1em] text-blue-800 underline"
        >
          {item.action_label || 'Open source'}
        </Link>
      ) : null}
    </article>
  )
}
