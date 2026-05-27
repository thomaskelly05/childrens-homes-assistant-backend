'use client'

import Link from 'next/link'

import type { SccifQualityStandardSummary } from '@/lib/os-api/sccif-alignment'

type Props = {
  summary: SccifQualityStandardSummary
}

export function SccifQualityStandardCard({ summary }: Props) {
  return (
    <article
      data-testid={`sccif-standard-${summary.area}`}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
        {summary.regulation_hint || 'Quality Standard'}
      </p>
      <h3 className="mt-1 text-sm font-black text-slate-950">{summary.title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">{summary.safe_summary}</p>
      <p className="mt-2 text-[10px] font-semibold text-slate-500">
        {summary.evidence_count} mapped item(s) · {summary.gap_count} gap(s)
      </p>
      <Link
        href={summary.route}
        className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 underline"
      >
        Explore
      </Link>
    </article>
  )
}
