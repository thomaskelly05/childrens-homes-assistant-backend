'use client'

import Link from 'next/link'

import type { SccifJudgementSummary } from '@/lib/os-api/sccif-alignment'

type Props = {
  summary: SccifJudgementSummary
}

export function SccifJudgementCard({ summary }: Props) {
  return (
    <article
      data-testid={`sccif-judgement-${summary.area}`}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <h3 className="text-sm font-black text-slate-950">{summary.title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">{summary.safe_summary}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <div>
          <dt>Evidence items</dt>
          <dd className="text-base font-black text-slate-900">{summary.evidence_count}</dd>
        </div>
        <div>
          <dt>Potential gaps</dt>
          <dd className="text-base font-black text-amber-800">{summary.gap_count}</dd>
        </div>
      </dl>
      <Link
        href={summary.route}
        className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 underline"
      >
        View alignment
      </Link>
    </article>
  )
}
